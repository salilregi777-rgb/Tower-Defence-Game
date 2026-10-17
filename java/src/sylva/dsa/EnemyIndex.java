package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.function.ToIntFunction;

/** Unbalanced binary search tree used to retrieve the live enemy object by ID. */
public final class EnemyIndex<T> implements Serializable {
    private static final class Node<T> implements Serializable { int key;T value;Node<T> left,right;Node(int k,T v){key=k;value=v;} }
    private Node<T> root;private int size;
    public int size(){return size;}
    public void put(int key,T value){if(root==null){root=new Node<>(key,value);size++;return;}Node<T> n=root;while(true){if(key==n.key){n.value=value;return;}if(key<n.key){if(n.left==null){n.left=new Node<>(key,value);size++;return;}n=n.left;}else{if(n.right==null){n.right=new Node<>(key,value);size++;return;}n=n.right;}}}
    public T get(int key){Node<T> n=root;while(n!=null){if(key==n.key)return n.value;n=key<n.key?n.left:n.right;}return null;}
    public T remove(int key){Node<T> parent=null,n=root;boolean left=false;while(n!=null&&n.key!=key){parent=n;left=key<n.key;n=left?n.left:n.right;}if(n==null)return null;T old=n.value;if(n.left!=null&&n.right!=null){Node<T> p=n,s=n.right;while(s.left!=null){p=s;s=s.left;}n.key=s.key;n.value=s.value;if(p==n)p.right=s.right;else p.left=s.right;}else{Node<T> child=n.left!=null?n.left:n.right;if(parent==null)root=child;else if(left)parent.left=child;else parent.right=child;}size--;return old;}
    public List<T> inorder(){List<T> out=new ArrayList<>(size);walk(root,out);return out;}
    private void walk(Node<T> n,List<T> out){if(n==null)return;walk(n.left,out);out.add(n.value);walk(n.right,out);}
    public String shape(ToIntFunction<T> id){return shape(root,id);}
    private String shape(Node<T> n,ToIntFunction<T> id){if(n==null)return "";return "("+id.applyAsInt(n.value)+shape(n.left,id)+shape(n.right,id)+")";}
}
