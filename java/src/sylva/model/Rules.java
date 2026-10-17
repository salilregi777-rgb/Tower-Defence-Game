package sylva.model;

import sylva.dsa.BinaryNode;
import sylva.dsa.BreadthFirstSearch;
import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Authored balance, wave recipes, build grid, and upgrade branches. */
public final class Rules {
    private Rules(){}
    public enum Difficulty {
        GENTLE("Gentle",.90,.95,1.12,1,1.10), GUARDED("Guarded",1.10,1,1,1,1.05), RESOLUTE("Resolute",1.35,1.04,.90,1,1), RELENTLESS("Relentless",1.70,1.09,.82,1.1,.93), SIEGE("Siege",2.20,1.14,.74,1.2,.85);
        public final String label;public final double hp,speed,spawn,count,reward;
        Difficulty(String label,double hp,double speed,double spawn,double count,double reward){this.label=label;this.hp=hp;this.speed=speed;this.spawn=spawn;this.count=count;this.reward=reward;}
    }
    public enum TowerKind {
        ARCHER("Thornspire","Thorn Archer",55,18,3.8,.58,0xcadf93,"Fast, precise thorns seek the first invader."),
        CANNON("Rootbreaker","Stone Mortar",105,62,3.25,1.8,0xe6bb7f,"Seedpods arc high and burst across a small area."),
        FROST("Winterbloom","Frost Bloom",80,12,3.3,.88,0xa9d8e0,"Crystalline spores slow invaders by 45%."),
        LIGHTNING("Stormwillow","Storm Willow",140,34,3.5,1.18,0xd1c1ec,"Living lightning chains through nearby invaders.");
        public final String name,buttonName,description;public final int cost,color;public final double damage,range,interval;
        TowerKind(String name,String buttonName,int cost,double damage,double range,double interval,int color,String description){this.name=name;this.buttonName=buttonName;this.cost=cost;this.damage=damage;this.range=range;this.interval=interval;this.color=color;this.description=description;}
    }
    public enum EnemyKind {
        BASIC("Blightling",46,1.22,9,5,.25,0xbfa47d),RUNNER("Skitter",31,2.05,10,6,.20,0xdcb893),TANK("Ironbark",168,.76,22,12,.38,0xa99583),RESISTANT("Ashveil",92,1.11,16,9,.29,0xb3a6c5),BOSS("The Hollow",1000,.59,120,35,.62,0xba8276);
        public final String name;public final int hp,reward,baseDamage,color;public final double speed,size;
        EnemyKind(String name,int hp,double speed,int reward,int baseDamage,double size,int color){this.name=name;this.hp=hp;this.speed=speed;this.reward=reward;this.baseDamage=baseDamage;this.size=size;this.color=color;}
    }
    public enum TargetMode { FIRST,LAST,STRONGEST,WEAKEST }
    public enum Phase { READY,WAVE,VICTORY,DEFEAT }
    public static final class Stats implements Serializable {
        public double damage,range,interval;public int multishot=1,chain=3;
        public Stats(double damage,double range,double interval){this.damage=damage;this.range=range;this.interval=interval;}
        public Stats copy(){Stats s=new Stats(damage,range,interval);s.multishot=multishot;s.chain=chain;return s;}
    }
    public static final class Upgrade implements Serializable {
        public final String name,description;public final int cost;public final double damageFactor,intervalFactor,rangeAdd;public final int multishot,chain;
        public Upgrade(String name,int cost,String description,double damageFactor,double intervalFactor,double rangeAdd,int multishot,int chain){this.name=name;this.cost=cost;this.description=description;this.damageFactor=damageFactor;this.intervalFactor=intervalFactor;this.rangeAdd=rangeAdd;this.multishot=multishot;this.chain=chain;}
        public void apply(Stats stats){stats.damage*=damageFactor;stats.interval*=intervalFactor;stats.range+=rangeAdd;stats.multishot=Math.max(stats.multishot,multishot);stats.chain=Math.max(stats.chain,chain);}
    }
    public record EnemySpec(EnemyKind kind,double delay,int ordinal) implements Serializable{}
    public record WaveRecord(int id,int wave,Difficulty difficulty,int kills,int leaked,int health,int reward) implements Serializable{}
    public record BuildCell(int col,int row) implements Serializable{}
    public record World(List<BuildCell> path,List<BuildCell> obstacles,List<BuildCell> buildable,boolean[][] walkable){}
    public static final BinaryNode<Upgrade> UPGRADE_ROOT=createUpgradeRoot(TowerKind.ARCHER);
    public static BinaryNode<Upgrade> createUpgradeRoot(TowerKind kind){
        int c=(int)Math.round(kind.cost*.85);BinaryNode<Upgrade> root=new BinaryNode<>("root",new Upgrade(kind.name,0,kind.description,1,1,0,1,3));
        BinaryNode<Upgrade> power=new BinaryNode<>("power",new Upgrade("Deep roots",c,"+65% damage, +0.25 reach",1.65,1,.25,1,3));
        BinaryNode<Upgrade> speed=new BinaryNode<>("speed",new Upgrade("Wild growth",c,"Attack 35% faster",1,.65,0,1,3));
        power.left=new BinaryNode<>("power-force",new Upgrade("Ancient force",(int)Math.round(c*1.6),"+80% damage",1.8,1,0,1,3));
        power.right=new BinaryNode<>("power-reach",new Upgrade("Canopy reach",(int)Math.round(c*1.45),"+1.6 reach, +20% damage",1.2,1,1.6,1,3));
        speed.left=new BinaryNode<>("speed-rapid",new Upgrade("Quickening",(int)Math.round(c*1.5),"Attack 40% faster",1,.60,0,1,3));
        boolean storm=kind==TowerKind.LIGHTNING;speed.right=new BinaryNode<>("speed-multi",new Upgrade(storm?"Storm network":"Abundance",(int)Math.round(c*1.65),storm?"Chain to 5 enemies, +25% damage":"Fire two projectiles, +15% damage",storm?1.25:1.15,1,0,2,storm?5:3));
        root.left=power;root.right=speed;return root;
    }
    public static List<String> upgradeOptions(String node){return upgradeOptions(TowerKind.ARCHER,node);}
    public static List<String> upgradeOptions(TowerKind kind,String node){BinaryNode<Upgrade> found=createUpgradeRoot(kind).find(node);return found==null?List.of():found.children().stream().map(n->n.id).toList();}
    public static Upgrade upgrade(String id){return upgrade(TowerKind.ARCHER,id);}
    public static Upgrade upgrade(TowerKind kind,String id){BinaryNode<Upgrade> found=createUpgradeRoot(kind).find(id);return found==null?null:found.value;}
    public static List<EnemySpec> wave(int wave,Difficulty difficulty){java.util.ArrayList<EnemySpec> result=new java.util.ArrayList<>();int count=(int)Math.round((6+wave*3)*difficulty.count);for(int i=0;i<count;i++){EnemyKind type=EnemyKind.BASIC;if(wave>=2&&i%4==2)type=EnemyKind.RUNNER;if(wave>=3&&i%6==4)type=EnemyKind.TANK;if(wave>=4&&i%5==3)type=EnemyKind.RESISTANT;result.add(new EnemySpec(type,Math.max(.38,.95-wave*.045)*difficulty.spawn,i+1));}if(wave%5==0)result.add((int)(result.size()*.65),new EnemySpec(EnemyKind.BOSS,1.6*difficulty.spawn,count+1));return result;}
    public static World world(){int rows=13,cols=17;boolean[][] walk=new boolean[rows][cols];int[][] waypoints={{0,5},{3,5},{3,9},{8,9},{8,2},{13,2},{13,6},{16,6}};for(int i=1;i<waypoints.length;i++){int c=waypoints[i-1][0],r=waypoints[i-1][1];walk[r][c]=true;while(c!=waypoints[i][0]||r!=waypoints[i][1]){c+=Integer.signum(waypoints[i][0]-c);r+=Integer.signum(waypoints[i][1]-r);walk[r][c]=true;}}BreadthFirstSearch.Result route=BreadthFirstSearch.find(walk,new BreadthFirstSearch.Cell(0,5),new BreadthFirstSearch.Cell(16,6));java.util.ArrayList<BuildCell> path=new java.util.ArrayList<>();for(var cell:route.path())path.add(new BuildCell(cell.col(),cell.row()));java.util.ArrayList<BuildCell> obstacles=new java.util.ArrayList<>(),build=new java.util.ArrayList<>();int[][] rocks={{0,0},{1,0},{5,1},{6,1},{15,0},{16,0},{0,11},{1,12},{5,12},{10,12},{11,11},{16,11},{15,12},{0,8},{12,9},{14,9},{11,5}};boolean[][] blocked=new boolean[rows][cols];for(int[] p:rocks){blocked[p[1]][p[0]]=true;obstacles.add(new BuildCell(p[0],p[1]));}for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(!walk[r][c]&&!blocked[r][c])build.add(new BuildCell(c,r));return new World(List.copyOf(path),List.copyOf(obstacles),List.copyOf(build),walk);}
    public static BreadthFirstSearch.Result findRoute(){World w=world();return BreadthFirstSearch.find(w.walkable,new BreadthFirstSearch.Cell(0,5),new BreadthFirstSearch.Cell(16,6));}
}
