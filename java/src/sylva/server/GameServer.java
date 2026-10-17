package sylva.server;

import com.sun.net.httpserver.*;
import sylva.model.*;
import sylva.model.Rules.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

/** Local JSON API: the Java engine owns simulation state and all DSA operations. */
public final class GameServer {
    private final GameEngine game=new GameEngine();
    private final HttpServer server;
    private final Path webRoot=Path.of("..").toAbsolutePath().normalize();
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"sylva-game-clock");t.setDaemon(true);return t;});
    private GameServer(int port)throws IOException{
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",port),0);
        server.createContext("/api/health",e->respond(e,200,Map.of("ok",true,"service","sylva-java")));
        server.createContext("/api/state",e->{synchronized(game){respond(e,200,map("state",state(),"inspector",inspector()));}});
        server.createContext("/api/inspector",e->{synchronized(game){respond(e,200,inspector());}});
        server.createContext("/api/action",this::action);
        server.createContext("/",this::staticFile);
        server.setExecutor(Executors.newFixedThreadPool(4,r->{Thread t=new Thread(r,"sylva-api");t.setDaemon(true);return t;}));
        clock.scheduleAtFixedRate(()->{synchronized(game){game.update(1.0/60);}},0,16,TimeUnit.MILLISECONDS);
    }
    public static void main(String[] args)throws Exception{int port=args.length==0?5173:Integer.parseInt(args[0]);GameServer app=new GameServer(port);app.server.start();System.out.println("SYLVA Java service and Three.js UI: http://127.0.0.1:"+port);}
    private void staticFile(HttpExchange e)throws IOException{if(!e.getRequestMethod().equals("GET")&& !e.getRequestMethod().equals("HEAD")){respond(e,405,Map.of("ok",false,"message","Method not allowed."));return;}String request=e.getRequestURI().getPath();Path target=webRoot.resolve("."+request).normalize();if(!target.startsWith(webRoot)){e.sendResponseHeaders(403,-1);e.close();return;}if(Files.isDirectory(target))target=target.resolve("index.html");if(!Files.isRegularFile(target)){e.sendResponseHeaders(404,-1);e.close();return;}String name=target.getFileName().toString();String type=name.endsWith(".html")?"text/html":name.endsWith(".js")?"text/javascript":name.endsWith(".css")?"text/css":name.endsWith(".json")?"application/json":name.endsWith(".woff2")?"font/woff2":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".png")?"image/png":name.endsWith(".jpg")||name.endsWith(".jpeg")?"image/jpeg":name.endsWith(".webp")?"image/webp":"application/octet-stream";e.getResponseHeaders().set("Content-Type",type+((type.startsWith("text/")||type.equals("application/json"))?"; charset=utf-8":""));e.getResponseHeaders().set("Cache-Control","no-cache");if(e.getRequestMethod().equals("HEAD")){e.sendResponseHeaders(200,-1);e.close();return;}byte[] bytes=Files.readAllBytes(target);e.sendResponseHeaders(200,bytes.length);try(OutputStream out=e.getResponseBody()){out.write(bytes);}}
    private void action(HttpExchange e)throws IOException{
        if(!e.getRequestMethod().equals("POST")){respond(e,405,Map.of("ok",false,"message","Use POST for game actions."));return;}
        try{@SuppressWarnings("unchecked") Map<String,Object> p=(Map<String,Object>)Json.parse(new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));Map<String,Object> result;synchronized(game){result=dispatch(p);result.put("state",state());result.put("inspector",inspector());}respond(e,200,result);}catch(Exception ex){respond(e,400,Map.of("ok",false,"message",ex.getMessage()==null?"Invalid action.":ex.getMessage()));}
    }
    private Map<String,Object> dispatch(Map<String,Object> p){String action=str(p,"action");int id=num(p,"id",game.selectedTowerId);boolean ok;String message;
        switch(action){
            case "place"->{var kind=TowerKind.valueOf(str(p,"type").toUpperCase(Locale.ROOT));ok=game.place(kind,num(p,"col",-1),num(p,"row",-1));}
            case "select"->{game.select(num(p,"id",-1));ok=true;}
            case "upgrade"->ok=game.upgrade(str(p,"branch"));
            case "sell"->ok=game.sell();
            case "undo"->ok=game.undo();
            case "redo"->ok=game.redo();
            case "target"->{game.setTargetMode(TargetMode.valueOf(str(p,"mode").toUpperCase(Locale.ROOT)));ok=true;}
            case "difficulty"->{int level=num(p,"value",3);game.setDifficulty(Difficulty.values()[Math.max(0,Math.min(4,level-1))]);ok=true;}
            case "wave"->{game.startWave();ok=true;}
            case "pause"->{if(p.containsKey("value"))game.paused=Boolean.TRUE.equals(p.get("value"));else game.togglePause();ok=true;}
            case "speed"->{game.cycleSpeed();ok=true;}
            case "restart"->{game.restart();ok=true;}
            case "save"->{game.save();ok=true;}
            case "load"->{game.load();ok=true;}
            case "log"->{game.log(str(p,"structure"),str(p,"operation"),str(p,"complexity"),str(p,"explanation"),List.of());ok=true;}
            case "history-search"->{WaveRecord record=game.history.get(id);game.log("B-tree","Search historical wave","O(log n)","Compare ordered keys and descend through the correct child until the requested record is found.",List.of("record "+id));Map<String,Object> found=new LinkedHashMap<>();found.put("ok",record!=null);found.put("message",record==null?"No completed wave has that record ID.":"Wave record found.");found.put("record",record==null?null:historyRecord(record));return found;}
            default->{ok=false;}
        }
        message=ok?switch(action){case "place"->"Guardian planted.";case "upgrade"->"Growth branch chosen.";case "sell"->"Guardian returned to the earth.";case "wave"->"The wave has begun.";case "restart"->"A new grove awaits.";case "save"->"Grove saved on this device.";case "load"->"Saved grove loaded.";default->"Action complete.";}:"That action is unavailable right now.";
        return new LinkedHashMap<>(Map.of("ok",ok,"message",message));
    }
    private Map<String,Object> state(){
        var world=game.world();String[][] grid=new String[13][17];for(int r=0;r<13;r++)for(int c=0;c<17;c++)grid[r][c]=world.walkable()[r][c]?"path":"build";for(BuildCell b:world.obstacles())grid[b.row()][b.col()]="obstacle";for(Tower t:game.towers)grid[t.row][t.col]="tower";
        List<Map<String,Object>> path=game.path.stream().map(c->map("col",c.col(),"row",c.row(),"x",c.col()-8,"z",c.row()-6)).toList();
        List<Map<String,Object>> towers=game.towers.stream().map(t->map("id",t.id,"type",lower(t.kind),"col",t.col,"row",t.row,"x",t.x(),"z",t.z(),"level",t.level,"stats",map("damage",t.stats.damage,"range",t.stats.range,"interval",t.stats.interval,"multishot",t.stats.multishot,"chain",t.stats.chain),"mode",lower(t.mode),"upgradeNode",t.upgradeNode,"invested",t.invested,"cooldown",t.cooldown,"firedAt",t.firedAt,"targetId",t.targetId,"plantedAt",t.firedAt)).toList();
        List<Map<String,Object>> enemies=game.enemies.stream().map(e->map("id",e.id,"type",lower(e.kind),"hp",e.hp,"maxHp",e.maxHp,"speed",e.speed,"velocity",e.velocity,"x",e.x,"z",e.z,"progress",e.progress,"angle",e.angle,"reward",e.reward,"baseDamage",e.baseDamage,"seed",e.seed,"slowUntil",e.slowUntil,"slowFactor",e.slowFactor,"hitAt",e.hitAt,"escaped",e.escaped)).toList();
        List<Map<String,Object>> shots=game.projectiles.values().stream().map(p->map("id",p.id,"type",lower(p.kind),"towerId",p.towerId,"targetId",p.targetId,"x",p.x,"y",p.y,"z",p.z,"originX",p.originX,"originZ",p.originZ,"targetX",p.targetX,"targetZ",p.targetZ,"damage",p.damage,"duration",p.duration,"age",p.age,"speed",p.speed,"vx",p.vx,"vy",p.vy,"vz",p.vz)).toList();
        Upgrade branch=game.selectedTower()==null?null:Rules.upgrade(game.selectedTower().kind,game.selectedTower().upgradeNode);
        return map("difficulty",game.difficulty.ordinal()+1,"health",game.health,"coins",game.coins,"wave",game.wave,"phase",game.phase.name().toLowerCase(Locale.ROOT),"paused",game.paused,"speed",game.speed,"time",game.time,"towers",towers,"enemies",enemies,"projectiles",shots,"queueSize",game.queue.size(),"queue",game.queue.values().stream().map(q->map("type",lower(q.kind()),"delay",q.delay(),"ordinal",q.ordinal())).toList(),"waveTotal",game.waveTotal,"waveKills",game.waveKills,"waveLeaked",game.waveLeaked,"waveDamage",game.waveDamage,"totalKills",game.totalKills,"selectedTowerId",game.selectedTowerId<0?null:game.selectedTowerId,"grid",grid,"path",path,"undoCount",game.undo.size(),"redoCount",game.redo.size(),"upgradeBranchName",branch==null?"Living grove":branch.name,"effects",game.drainEvents(),"history",game.history.values().stream().map(this::historyRecord).toList());
    }
    private Map<String,Object> historyRecord(WaveRecord r){return map("id",r.id(),"run",1,"wave",r.wave(),"difficulty",r.difficulty().ordinal()+1,"kills",r.kills(),"leaked",r.leaked(),"damage",0,"earned",r.reward(),"health",r.health(),"duration",0);}
    private Map<String,Object> inspector(){
        Tower t=game.selectedTower();List<Map<String,Object>> options=game.availableUpgrades().stream().map(id->{Upgrade u=Rules.upgrade(t.kind,id);return map("id",id,"name",u.name,"cost",u.cost,"description",u.description,"modifiers",map("damage",u.damageFactor,"interval",u.intervalFactor,"range",u.rangeAdd,"multishot",u.multishot,"chain",u.chain));}).toList();
        List<Map<String,Object>> queue=game.queue.values().stream().map(q->map("type",lower(q.kind()),"delay",q.delay(),"ordinal",q.ordinal())).toList();
        List<Map<String,Object>> linked=game.projectiles.values().stream().map(p->map("id",p.id,"type",lower(p.kind),"targetId",p.targetId)).toList();
        List<Map<String,Object>> heap=game.heapTargets().stream().map(e->map("id",e.id,"progress",Math.round(e.progress*100)/100.0,"hp",Math.ceil(e.hp),"type",lower(e.kind))).toList();
        List<Map<String,Object>> ordered=game.indexedEnemies().stream().map(e->map("id",e.id,"hp",Math.ceil(e.hp),"type",lower(e.kind))).toList();
        Object bst=null;for(int i=ordered.size()-1;i>=0;i--){Map<String,Object> node=new LinkedHashMap<>(ordered.get(i));node.put("left",null);node.put("right",bst);bst=node;}
        var route=Rules.findRoute();List<Map<String,Object>> routeCells=route.path().stream().map(c->map("col",c.col(),"row",c.row())).toList();List<Map<String,Object>> order=route.order().stream().map(c->map("col",c.col(),"row",c.row())).toList();
        List<List<String>> grid=new ArrayList<>();for(int r=0;r<13;r++){List<String> row=new ArrayList<>();for(int c=0;c<17;c++)row.add(game.world().walkable()[r][c]?"path":"build");grid.add(row);}for(BuildCell b:game.world().obstacles())grid.get(b.row()).set(b.col(),"obstacle");
        Map<String,Object> upgradeTree=upgradeNode(Rules.createUpgradeRoot(t==null?TowerKind.ARCHER:t.kind));List<Map<String,Object>> history=game.history.values().stream().map(this::historyRecord).toList();List<Map<String,Object>> ops=game.operations.stream().map(o->map("structure",uiStructure(o.structure()),"operation",o.name(),"complexity",o.cost(),"explanation",o.explanation(),"nodes",o.nodes(),"time",o.at())).toList();
        Map<String,Object> queueMeta=map("head",game.queue.headIndex(),"tail",game.queue.tailIndex(),"capacity",game.queue.capacity(),"size",game.queue.size());
        return map("queue",queue,"queueMeta",queueMeta,"linkedList",linked,"heap",heap,"heapTowerId",t==null?null:t.id,"heapMode",t==null?"first":lower(t.mode),"heapTargetId",heap.isEmpty()?null:heap.get(0).get("id"),"heapLastExtractedId",null,"heapTowerMode",t==null?"first":lower(t.mode),"bst",bst,"bstOrdered",ordered.stream().map(e->e.get("id")).toList(),"undo",game.undo.values().stream().map(d->map("kind",d.kind(),"id",d.towerId(),"coinDelta",d.coinDelta())).toList(),"redo",game.redo.values().stream().map(d->map("kind",d.kind(),"id",d.towerId(),"coinDelta",d.coinDelta())).toList(),"upgradeTree",upgradeTree,"upgradeNode",t==null?"root":t.upgradeNode,"upgradeType",t==null?"archer":lower(t.kind),"upgrades",options,"btree",btreeShape(history),"history",history,"btreeSplits",game.history.splits(),"bfs",map("path",routeCells,"order",order,"visited",route.visited(),"grid",grid,"steps",order.size()),"operations",ops,"towerId",t==null?null:t.id);
    }
    private Map<String,Object> upgradeNode(sylva.dsa.BinaryNode<Upgrade> node){if(node==null)return null;Upgrade u=node.value;return map("id",node.id,"name",u.name,"cost",u.cost,"description",u.description,"modifiers",map("damage",u.damageFactor,"interval",u.intervalFactor,"range",u.rangeAdd,"multishot",u.multishot,"chain",u.chain),"left",upgradeNode(node.left),"right",upgradeNode(node.right));}
    private Map<String,Object> btreeShape(List<Map<String,Object>> history){return btreeNode(game.history.snapshot(),history);}
    private Map<String,Object> btreeNode(sylva.dsa.WaveHistory.NodeSnapshot node,List<Map<String,Object>> history){List<Map<String,Object>> records=node.keys().stream().map(k->history.stream().filter(r->Objects.equals(r.get("id"),k)).findFirst().orElse(Map.of())).toList();return map("keys",node.keys(),"leaf",node.leaf(),"records",records,"children",node.children().stream().map(child->btreeNode(child,history)).toList());}
    private String uiStructure(String s){return switch(s){case "Singly linked list"->"Linked list";case "Binary search tree"->"BST";default->s;};}
    private static String lower(Enum<?> e){return e.name().toLowerCase(Locale.ROOT);}
    private static int num(Map<String,Object> m,String k,int fallback){Object v=m.get(k);return v instanceof Number n?n.intValue():fallback;}
    private static String str(Map<String,Object> m,String k){Object v=m.get(k);return v==null?"":String.valueOf(v);}
    private static Map<String,Object> map(Object... kv){Map<String,Object> m=new LinkedHashMap<>();for(int i=0;i+1<kv.length;i+=2)m.put(String.valueOf(kv[i]),kv[i+1]);return m;}
    private static void respond(HttpExchange e,int status,Object body)throws IOException{byte[] bytes=Json.stringify(body).getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");e.getResponseHeaders().set("Access-Control-Allow-Origin","*");e.getResponseHeaders().set("Access-Control-Allow-Headers","Content-Type");e.getResponseHeaders().set("Access-Control-Allow-Methods","GET, POST, OPTIONS");if(e.getRequestMethod().equals("OPTIONS")){e.sendResponseHeaders(204,-1);return;}e.sendResponseHeaders(status,bytes.length);try(OutputStream out=e.getResponseBody()){out.write(bytes);}}
}
