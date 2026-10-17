package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Binary max heap. Comparator-positive values rise toward the root. */
public final class MaxHeap<T> implements Serializable {
    private final ArrayList<T> items=new ArrayList<>();
    private final Comparator<T> comparator;
    public MaxHeap(Comparator<T> comparator){this.comparator=comparator;}
    public int size(){return items.size();} public boolean isEmpty(){return items.isEmpty();} public T peek(){return items.isEmpty()?null:items.get(0);}
    public void add(T value){items.add(value);int i=items.size()-1;while(i>0){int p=(i-1)/2;if(comparator.compare(items.get(i),items.get(p))<=0)break;swap(i,p);i=p;}}
    public T poll(){if(items.isEmpty())return null;T top=items.get(0),last=items.remove(items.size()-1);if(!items.isEmpty()){items.set(0,last);int i=0;while(true){int l=2*i+1,r=l+1,b=i;if(l<items.size()&&comparator.compare(items.get(l),items.get(b))>0)b=l;if(r<items.size()&&comparator.compare(items.get(r),items.get(b))>0)b=r;if(b==i)break;swap(i,b);i=b;}}return top;}
    private void swap(int a,int b){T t=items.get(a);items.set(a,items.get(b));items.set(b,t);}
    public List<T> values(){return List.copyOf(items);}
}
