package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

/** Singly linked list with constant-time tail insertion and safe in-place filtering. */
public final class ProjectileList<T> implements Serializable {
    private static final class Node<T> implements Serializable { T value; Node<T> next; Node(T value){this.value=value;} }
    private Node<T> head,tail; private int size;
    public int size(){return size;} public boolean isEmpty(){return size==0;}
    public void add(T value){Node<T> n=new Node<>(value);if(tail==null)head=n;else tail.next=n;tail=n;size++;}
    public void filterInPlace(Predicate<T> keep){Node<T> previous=null,node=head;while(node!=null){Node<T> next=node.next;if(!keep.test(node.value)){if(previous==null)head=next;else previous.next=next;if(tail==node)tail=previous;size--;}else previous=node;node=next;}}
    public List<T> values(){List<T> out=new ArrayList<>(size);for(Node<T> n=head;n!=null;n=n.next)out.add(n.value);return out;}
}
