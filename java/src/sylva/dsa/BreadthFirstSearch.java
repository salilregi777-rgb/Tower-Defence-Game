package sylva.dsa;

import java.util.ArrayList;
import java.util.List;

/** Shortest orthogonal route over walkable cells; predecessor links rebuild the trail. */
public final class BreadthFirstSearch {
    private BreadthFirstSearch(){}
    public record Cell(int col,int row){}
    public record Result(List<Cell> path,List<Cell> order,boolean[][] visited){}
    public static Result find(boolean[][] walkable,Cell start,Cell goal){int rows=walkable.length,cols=rows==0?0:walkable[0].length;boolean[][] seen=new boolean[rows][cols];Cell[][] previous=new Cell[rows][cols];List<Cell> order=new ArrayList<>();CircularQueue<Cell> q=new CircularQueue<>(Math.max(1,rows*cols));if(!inside(start,rows,cols)||!inside(goal,rows,cols)||!walkable[start.row][start.col]||!walkable[goal.row][goal.col])return new Result(List.of(),order,seen);q.offer(start);seen[start.row][start.col]=true;int[][] dirs={{1,0},{0,1},{-1,0},{0,-1}};while(!q.isEmpty()){Cell p=q.poll();order.add(p);if(p.equals(goal))break;for(int[] d:dirs){int c=p.col+d[0],r=p.row+d[1];if(r>=0&&r<rows&&c>=0&&c<cols&&walkable[r][c]&&!seen[r][c]){seen[r][c]=true;previous[r][c]=p;q.offer(new Cell(c,r));}}}List<Cell> path=new ArrayList<>();if(seen[goal.row][goal.col]){for(Cell p=goal;p!=null;p=previous[p.row][p.col])path.add(0,p);}return new Result(List.copyOf(path),List.copyOf(order),seen);}
    private static boolean inside(Cell p,int rows,int cols){return p!=null&&p.row>=0&&p.row<rows&&p.col>=0&&p.col<cols;}
}
