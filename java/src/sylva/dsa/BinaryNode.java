package sylva.dsa;

import java.io.Serializable;
import java.util.List;

/** Node for the explicit binary upgrade tree. */
public final class BinaryNode<T> implements Serializable {
    public final String id; public final T value; public BinaryNode<T> left,right;
    public BinaryNode(String id,T value){this.id=id;this.value=value;}
    public BinaryNode<T> find(String target){if(id.equals(target))return this;BinaryNode<T> n=left==null?null:left.find(target);return n!=null?n:right==null?null:right.find(target);}
    public List<BinaryNode<T>> children(){return java.util.stream.Stream.of(left,right).filter(java.util.Objects::nonNull).toList();}
}
