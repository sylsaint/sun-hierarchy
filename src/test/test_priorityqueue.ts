import { expect } from 'chai';
import PriorityQueue, { Comparable, CompareFunction } from '../misc/priorityQueue';

describe('Priority Queue Test', () => {
    const item1: Comparable = { value: 2 };
    const item2: Comparable = { value: 4 };
    const item3: Comparable = { value: 6 };
    const item4: Comparable = { value: 8 };
    const item5: Comparable = { value: 10 };
    const pq: PriorityQueue<Comparable> = new PriorityQueue<Comparable>();
    pq.insert(item1);
    pq.insert(item2);
    pq.insert(item3);
    pq.insert(item4);
    pq.insert(item5);

  it('#less than start', () => {
    const item: Comparable = { value: 1 };
    pq.insert(item);
    const r: Comparable = pq.pop() as Comparable;
    expect(r.value).equal(item.value);
  });
  it('#bigger than end', () => {
    const item: Comparable = { value: 12 };
    pq.insert(item);
    expect(pq.data[pq.data.length-1].value).equal(item.value);
  });
  it('#equals to start', () => {
    const item: Comparable = { value: 2 };
    pq.insert(item);
    expect(pq.data[0].value).equal(item.value);
  });
  it('#equals to end', () => {
    const item: Comparable = { value: 12 };
    pq.insert(item);
    expect(pq.data[pq.data.length-1].value).equal(item.value);
  });
  it('#equals to middle', () => {
    const item: Comparable = { value: 6 };
    pq.insert(item);
    expect(pq.data[2].value).equal(item.value);
  });
  it('#between the middle', () => {
    const item: Comparable = { value: 7 };
    pq.insert(item);
    expect(pq.data[3].value).equal(item.value);
  });
  it('#between the start', () => {
    const item: Comparable = { value: 3 };
    pq.insert(item);
    expect(pq.data[1].value).equal(item.value);
  });
  it('#between the end', () => {
    const item: Comparable = { value: 11 };
    pq.insert(item);
    expect(pq.data[pq.data.length-2].value).equal(item.value);
  });
});


