package sylva;

import sylva.dsa.*;
import sylva.model.*;
import sylva.model.Rules.*;
import java.util.*;

/** Dependency-free checks for Java DSA invariants and the deterministic 10-wave balance. */
public final class SelfCheck {
    private static int checks;
    private static void check(boolean condition,String message){checks++;if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){queue();heap();trees();route();economy();System.out.println("Java SYLVA checks passed: "+checks);}
    private static void queue(){CircularQueue<Integer> q=new CircularQueue<>(3);check(q.offer(1)&&q.offer(2)&&q.offer(3),"queue fills");check(!q.offer(4),"queue enforces capacity");check(q.poll()==1&&q.poll()==2,"FIFO removal");q.offer(4);q.offer(5);check(q.values().equals(List.of(3,4,5)),"circular wrap preserves order");DecisionStack<Integer>s=new DecisionStack<>();s.push(1);s.push(2);check(s.pop()==2&&s.pop()==1,"stack is LIFO");ProjectileList<Integer> list=new ProjectileList<>();list.add(1);list.add(2);list.add(3);list.filterInPlace(x->x!=2);check(list.values().equals(List.of(1,3)),"list removal preserves links");}
    private static void heap(){MaxHeap<Integer> h=new MaxHeap<Integer>(Comparator.naturalOrder());for(int n:new int[]{4,8,1,7,2})h.add(n);check(h.poll()==8&&h.poll()==7&&h.poll()==4,"heap extracts maximum");}
    private static void trees(){EnemyIndex<String> bst=new EnemyIndex<>();for(int n:new int[]{5,2,9,1,3,7,11})bst.put(n,"e"+n);check(bst.remove(5).equals("e5")&&bst.get(7).equals("e7"),"BST deletes two-child root");WaveHistory<Integer> b=new WaveHistory<>();for(int n=0;n<100;n++)b.put(n,n*n);check(b.size()==100&&b.splits()>10&&b.get(83)==6889,"B-tree median splits and search");check(b.values().equals(java.util.stream.IntStream.range(0,100).map(n->n*n).boxed().toList()),"B-tree ordered traversal");check(Rules.upgradeOptions("root").equals(List.of("power","speed"))&&Rules.upgrade("power-force")!=null,"live binary upgrade tree");}
    private static void route(){var r=Rules.findRoute();check(r.path().size()==32,"BFS shortest path contains 32 tiles");check(r.path().getFirst().equals(new BreadthFirstSearch.Cell(0,5))&&r.path().getLast().equals(new BreadthFirstSearch.Cell(16,6)),"BFS endpoints");}
    private static GameEngine campaign(boolean reinvest){GameEngine g=new GameEngine();String[][] towers={{"ARCHER","5","8"},{"FROST","7","7"},{"ARCHER","9","5"},{"CANNON","7","3"},{"LIGHTNING","12","4"},{"ARCHER","4","6"},{"CANNON","9","8"},{"LIGHTNING","11","3"},{"ARCHER","6","10"},{"FROST","12","6"}};for(int wave=1;wave<=10&&g.phase!=Phase.DEFEAT;wave++){if(wave==1||reinvest){for(String[] p:towers)g.place(TowerKind.valueOf(p[0]),Integer.parseInt(p[1]),Integer.parseInt(p[2]));for(Tower t:new ArrayList<>(g.towers))for(int k=0;k<2;k++){List<String> options=g.availableUpgrades();if(!options.isEmpty()){g.select(t.id);g.upgrade(options.getFirst());}}}g.startWave();for(int i=0;i<12000&&g.phase==Phase.WAVE;i++)g.update(1/60.0);check(g.phase!=Phase.WAVE,"wave advances");}return g;}
    private static void economy(){GameEngine bare=campaign(false);check(bare.phase==Phase.DEFEAT&&bare.wave==5,"default difficulty needs reinvestment");GameEngine grown=campaign(true);check(grown.phase==Phase.VICTORY&&grown.wave==10,"earned-seed reinvestment wins ten waves");check(grown.history.size()==10&&grown.history.splits()>0,"B-tree records the full campaign");}
}
