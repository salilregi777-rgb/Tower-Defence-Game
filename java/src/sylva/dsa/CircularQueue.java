package sylva.dsa;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/** Fixed-capacity FIFO with wrapping head and tail indices. */
public final class CircularQueue<T> implements Serializable {
    private final Object[] items;
    private int head, tail, size;
    public CircularQueue(int capacity) { if (capacity < 1) throw new IllegalArgumentException("Capacity must be positive"); items = new Object[capacity]; }
    public int size() { return size; }
    public int capacity() { return items.length; }
    public int headIndex() { return head; }
    public int tailIndex() { return tail; }
    public boolean isEmpty() { return size == 0; }
    public boolean offer(T value) { if (size == items.length) return false; items[tail] = value; tail = (tail + 1) % items.length; size++; return true; }
    @SuppressWarnings("unchecked") public T poll() { if (size == 0) return null; T value = (T)items[head]; items[head] = null; head = (head + 1) % items.length; size--; return value; }
    @SuppressWarnings("unchecked") public T peek() { return size == 0 ? null : (T)items[head]; }
    public List<T> values() { List<T> result = new ArrayList<>(size); for (int i=0;i<size;i++) { @SuppressWarnings("unchecked") T value=(T)items[(head+i)%items.length]; result.add(value); } return result; }
    public void clear() { java.util.Arrays.fill(items,null); head=tail=size=0; }
}
