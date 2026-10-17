package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/** Minimum-degree-2 B-tree index with median promotion on full-child insertion. */
public final class WaveHistory<T> implements Serializable {
    public record NodeSnapshot(List<Integer> keys, boolean leaf, List<NodeSnapshot> children) {}
    private static final int T_DEGREE=2, MAX=3;
    private static final class Node<T> implements Serializable { boolean leaf=true; final ArrayList<Integer> keys=new ArrayList<>(); final ArrayList<T> values=new ArrayList<>(); final ArrayList<Node<T>> children=new ArrayList<>(); }
    private Node<T> root=new Node<>();private int size,splits;
    public int size(){return size;}public int splits(){return splits;}
    public T get(int key){Node<T> n=root;while(true){int i=0;while(i<n.keys.size()&&key>n.keys.get(i))i++;if(i<n.keys.size()&&key==n.keys.get(i))return n.values.get(i);if(n.leaf)return null;n=n.children.get(i);}}
    public void put(int key,T value){if(get(key)!=null){replace(root,key,value);return;}if(root.keys.size()==MAX){Node<T> old=root;root=new Node<>();root.leaf=false;root.children.add(old);split(root,0);}insert(root,key,value);size++;}
    private void replace(Node<T> n,int key,T value){int i=0;while(i<n.keys.size()&&key>n.keys.get(i))i++;if(i<n.keys.size()&&n.keys.get(i)==key){n.values.set(i,value);return;}if(!n.leaf)replace(n.children.get(i),key,value);}
    private void split(Node<T> p,int i){Node<T> a=p.children.get(i),b=new Node<>();b.leaf=a.leaf;int median=a.keys.get(1);T mv=a.values.get(1);for(int j=2;j<a.keys.size();j++){b.keys.add(a.keys.get(j));b.values.add(a.values.get(j));}if(!a.leaf)for(int j=2;j<a.children.size();j++)b.children.add(a.children.get(j));while(a.keys.size()>1){a.keys.remove(a.keys.size()-1);a.values.remove(a.values.size()-1);}if(!a.leaf)while(a.children.size()>2)a.children.remove(a.children.size()-1);p.keys.add(i,median);p.values.add(i,mv);p.children.add(i+1,b);splits++;}
    private void insert(Node<T> n,int key,T value){int i=n.keys.size()-1;if(n.leaf){n.keys.add(0);n.values.add(null);while(i>=0&&key<n.keys.get(i)){n.keys.set(i+1,n.keys.get(i));n.values.set(i+1,n.values.get(i));i--;}n.keys.set(i+1,key);n.values.set(i+1,value);return;}while(i>=0&&key<n.keys.get(i))i--;i++;if(n.children.get(i).keys.size()==MAX){split(n,i);if(key>n.keys.get(i))i++;}insert(n.children.get(i),key,value);}
    public List<T> values(){List<T> out=new ArrayList<>(size);walk(root,out);return out;}
    public NodeSnapshot snapshot(){return snapshot(root);}
    private NodeSnapshot snapshot(Node<T> n){return new NodeSnapshot(List.copyOf(n.keys),n.leaf,n.children.stream().map(this::snapshot).toList());}
    private void walk(Node<T> n,List<T> out){for(int i=0;i<n.keys.size();i++){if(!n.leaf)walk(n.children.get(i),out);out.add(n.values.get(i));}if(!n.leaf)walk(n.children.get(n.keys.size()),out);}
    public String describe(){return describe(root,0);}
    private String describe(Node<T> n,int depth){StringBuilder s=new StringBuilder("  ".repeat(depth)).append(n.keys).append(n.leaf?" leaf\n":"\n");for(Node<T> child:n.children)s.append(describe(child,depth+1));return s.toString();}
}
