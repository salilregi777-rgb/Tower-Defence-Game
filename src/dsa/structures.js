/** Hand-written structures used by SYLVA's simulation; no sorting libraries. */
export class CircularQueue {
  constructor(capacity = 256) { this.capacity = Math.max(1, capacity); this.items = new Array(this.capacity); this.head = 0; this.tail = 0; this.size = 0; }
  enqueue(value) { if (this.isFull()) throw new Error('Queue capacity reached'); this.items[this.tail] = value; this.tail = (this.tail + 1) % this.capacity; this.size++; return value; }
  dequeue() { if (this.isEmpty()) return undefined; const value = this.items[this.head]; this.items[this.head] = undefined; this.head = (this.head + 1) % this.capacity; this.size--; return value; }
  peek() { return this.size ? this.items[this.head] : undefined; }
  isEmpty() { return this.size === 0; }
  isFull() { return this.size === this.capacity; }
  toArray() { return Array.from({ length: this.size }, (_, i) => this.items[(this.head + i) % this.capacity]); }
}

export class Stack {
  constructor() { this.items = []; this.size = 0; }
  push(value) { this.items[this.size++] = value; return value; }
  pop() { if (this.isEmpty()) return undefined; const value = this.items[--this.size]; this.items.length = this.size; return value; }
  peek() { return this.items[this.size - 1]; }
  isEmpty() { return this.size === 0; }
  clear() { this.items = []; this.size = 0; }
  toArray() { return this.items.slice(0, this.size); }
}

export class LinkedList {
  constructor() { this.head = null; this.tail = null; this.size = 0; }
  insert(value) { const node = { value, next: null }; if (this.tail) this.tail.next = node; else this.head = node; this.tail = node; this.size++; return node; }
  delete(predicate) { const match = typeof predicate === 'function' ? predicate : value => value.id === predicate; let previous = null, node = this.head; while (node) { if (match(node.value)) { if (previous) previous.next = node.next; else this.head = node.next; if (node === this.tail) this.tail = previous; this.size--; return node.value; } previous = node; node = node.next; } return undefined; }
  search(predicate) { const match = typeof predicate === 'function' ? predicate : value => value.id === predicate; let node = this.head; while (node) { if (match(node.value)) return node.value; node = node.next; } return undefined; }
  traverse(visit) { let node = this.head; while (node) { const next = node.next; visit(node.value); node = next; } }
  filterInPlace(keep) { let previous = null, node = this.head; while (node) { const next = node.next; if (!keep(node.value)) { if (previous) previous.next = next; else this.head = next; if (this.tail === node) this.tail = previous; this.size--; } else previous = node; node = next; } }
  toArray() { const values = []; this.traverse(value => values.push(value)); return values; }
}

export class MaxHeap {
  constructor(compare = (a, b) => a - b) { this.items = []; this.compare = compare; }
  get size() { return this.items.length; }
  insert(value) { this.items.push(value); this.heapifyUp(this.items.length - 1); return value; }
  peek() { return this.items[0]; }
  extractMax() { if (!this.items.length) return undefined; const top = this.items[0], last = this.items.pop(); if (this.items.length) { this.items[0] = last; this.heapifyDown(0); } return top; }
  heapifyUp(index) { while (index > 0) { const parent = Math.floor((index - 1) / 2); if (this.compare(this.items[index], this.items[parent]) <= 0) break; [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]]; index = parent; } }
  heapifyDown(index) { while (true) { const left = index * 2 + 1, right = left + 1; let best = index; if (left < this.size && this.compare(this.items[left], this.items[best]) > 0) best = left; if (right < this.size && this.compare(this.items[right], this.items[best]) > 0) best = right; if (best === index) break; [this.items[index], this.items[best]] = [this.items[best], this.items[index]]; index = best; } }
  toArray() { return this.items.slice(); }
}

export class BinarySearchTree {
  constructor() { this.root = null; this.size = 0; }
  insert(key, value) { const node = { key, value, left: null, right: null }; if (!this.root) { this.root = node; this.size++; return value; } let current = this.root; while (current) { if (key === current.key) { current.value = value; return value; } const side = key < current.key ? 'left' : 'right'; if (!current[side]) { current[side] = node; this.size++; return value; } current = current[side]; } }
  search(key) { let current = this.root; while (current) { if (key === current.key) return current.value; current = key < current.key ? current.left : current.right; } return undefined; }
  delete(key) { let removed; const remove = (node, target) => { if (!node) return null; if (target < node.key) node.left = remove(node.left, target); else if (target > node.key) node.right = remove(node.right, target); else { if (target === key) removed = node.value; if (!node.left) return node.right; if (!node.right) return node.left; let successor = node.right; while (successor.left) successor = successor.left; node.key = successor.key; node.value = successor.value; node.right = remove(node.right, successor.key); } return node; }; this.root = remove(this.root, key); if (removed !== undefined) this.size--; return removed; }
  inorderTraversal(visit) { const values = []; const walk = node => { if (!node) return; walk(node.left); values.push(node.value); if (visit) visit(node.value, node.key); walk(node.right); }; walk(this.root); return values; }
  snapshot() { const walk = node => node ? { id: node.key, hp: Math.ceil(node.value.hp), type: node.value.type, left: walk(node.left), right: walk(node.right) } : null; return walk(this.root); }
}

export class BinaryTree {
  constructor(root) { this.root = root; }
  search(id, node = this.root) { if (!node) return null; return node.id === id ? node : this.search(id, node.left) || this.search(id, node.right); }
  children(id) { const node = this.search(id); return node ? [node.left, node.right].filter(Boolean) : []; }
  traverse(visit, node = this.root) { if (!node) return; visit(node); this.traverse(visit, node.left); this.traverse(visit, node.right); }
}

/** Minimum-degree B-tree. Values accompany keys through median promotion. */
export class BTree {
  constructor(degree = 2) { if (degree < 2) throw new Error('B-tree degree must be at least 2'); this.degree = degree; this.root = { leaf: true, keys: [], values: [], children: [] }; this.size = 0; this.splits = 0; }
  search(key, node = this.root) { let i = 0; while (i < node.keys.length && key > node.keys[i]) i++; if (i < node.keys.length && key === node.keys[i]) return node.values[i]; return node.leaf ? undefined : this.search(key, node.children[i]); }
  insert(key, value) { const replace = node => { let i = 0; while (i < node.keys.length && key > node.keys[i]) i++; if (node.keys[i] === key) { node.values[i] = value; return true; } return !node.leaf && replace(node.children[i]); }; if (replace(this.root)) return value; if (this.root.keys.length === 2 * this.degree - 1) { const old = this.root; this.root = { leaf: false, keys: [], values: [], children: [old] }; this.splitChild(this.root, 0); } this.insertNonFull(this.root, key, value); this.size++; return value; }
  splitChild(parent, index) { const t = this.degree, left = parent.children[index], right = { leaf: left.leaf, keys: left.keys.slice(t), values: left.values.slice(t), children: left.leaf ? [] : left.children.slice(t) }; const medianKey = left.keys[t - 1], medianValue = left.values[t - 1]; left.keys.length = t - 1; left.values.length = t - 1; if (!left.leaf) left.children.length = t; parent.keys.splice(index, 0, medianKey); parent.values.splice(index, 0, medianValue); parent.children.splice(index + 1, 0, right); this.splits++; }
  insertNonFull(node, key, value) { let i = node.keys.length - 1; if (node.leaf) { while (i >= 0 && key < node.keys[i]) i--; node.keys.splice(i + 1, 0, key); node.values.splice(i + 1, 0, value); } else { while (i >= 0 && key < node.keys[i]) i--; i++; if (node.children[i].keys.length === 2 * this.degree - 1) { this.splitChild(node, i); if (key > node.keys[i]) i++; } this.insertNonFull(node.children[i], key, value); } }
  traverse(visit) { const result = []; const walk = node => { for (let i = 0; i < node.keys.length; i++) { if (!node.leaf) walk(node.children[i]); result.push(node.values[i]); if (visit) visit(node.values[i], node.keys[i]); } if (!node.leaf) walk(node.children[node.keys.length]); }; walk(this.root); return result; }
  snapshot(node = this.root) { return { keys: node.keys.slice(), leaf: node.leaf, records: node.values.map(value => ({ ...value })), children: node.children.map(child => this.snapshot(child)) }; }
}

/** BFS deliberately uses the same FIFO queue implementation as enemy waves. */
export function bfs(grid, start, end, traversable = value => value === 'path') {
  const rows = grid.length, cols = grid[0]?.length || 0, queue = new CircularQueue(rows * cols);
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const previous = Array.from({ length: rows }, () => Array(cols).fill(null));
  const order = [], inside = point => point && Number.isInteger(point.row) && Number.isInteger(point.col) && point.row >= 0 && point.row < rows && point.col >= 0 && point.col < cols;
  if (!inside(start) || !inside(end) || grid.some(row => row.length !== cols) || !traversable(grid[start.row][start.col]) || !traversable(grid[end.row][end.col])) return { path: [], visited, order, previous };
  queue.enqueue(start); visited[start.row][start.col] = true;
  while (!queue.isEmpty()) { const point = queue.dequeue(); order.push(point); if (point.col === end.col && point.row === end.row) break; for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const col = point.col + dc, row = point.row + dr; if (row >= 0 && row < rows && col >= 0 && col < cols && !visited[row][col] && traversable(grid[row][col])) { visited[row][col] = true; previous[row][col] = point; queue.enqueue({ col, row }); } } }
  const path = []; if (visited[end.row][end.col]) { let point = end; while (point) { path.push(point); point = previous[point.row][point.col]; } path.reverse(); }
  return { path, visited, order, previous };
}
