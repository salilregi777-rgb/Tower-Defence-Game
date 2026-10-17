package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

/** LIFO stack for reversible player decisions. */
public final class DecisionStack<T> implements Serializable {
    private final ArrayDeque<T> values = new ArrayDeque<>();
    public void push(T value) { values.push(value); }
    public T pop() { return values.poll(); }
    public T peek() { return values.peek(); }
    public int size() { return values.size(); }
    public boolean isEmpty() { return values.isEmpty(); }
    public void clear() { values.clear(); }
    public List<T> values() { return new ArrayList<>(values); }
}
