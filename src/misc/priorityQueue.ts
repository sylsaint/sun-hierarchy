export interface Comparable {
    value: number;
}

export interface CompareFunction<T extends Comparable> {
    (item1: T, item2: T): number;
}

export default class PriorityQueue<T extends Comparable> {
    data: T[] = [];
    compareFn: CompareFunction<T> = function(item1: T, item2: T): number {
        const v = item1.value - item2.value;
        if (v > 0) return 1;
        if (v < 0) return -1;
        return 0; 
    };
    constructor(compareFn?: CompareFunction<T>) {
        if (compareFn) {
            this.compareFn = compareFn;
        }
    }

    insert(item: T) {
        if (this.data.length === 0) {
            this.data.push(item);
            return;
        }
        // 此处采用二分查找插入，可以控制插入复杂度在O(log(n))
        // 按情况讨论
        // 1. 找到相同的内容，不插入
        // 2. 找到可以插入的位置并且位于中间，this.data[start] < item < this.data[end]
        let start: number = 0;
        let end: number = this.data.length - 1;
        // 找到可以插入的位置并且位于开始处, this.data[0] > item
        if (this.compareFn(this.data[start], item) > 0) {
            this.data.unshift(item);
        }
        // 找到可以插入的位置并且位于结束处, this.data[this.data.length-1] < item
        if (this.compareFn(this.data[end], item) < 0) {
            this.data.push(item);
        }
        // 1. 找到相同的内容，不插入
        // 2. 找到可以插入的位置并且位于中间，this.data[start] < item < this.data[end]
        let currentIdx = Math.floor(this.data.length / 2);
        while (end - start > 1) {
            const cmpRet = this.compareFn(item, this.data[currentIdx]);
            if (cmpRet < 0) {
                end = currentIdx;
            }
            if (cmpRet > 0) {
                start = currentIdx;
            }
            if (cmpRet === 0) {
                start = currentIdx;
                break;
            }
            currentIdx = Math.floor((start + end) / 2);
        }
        if (this.compareFn(this.data[start], item) < 0 && this.compareFn(item, this.data[end]) < 0) {
            this.data.splice(end, 0, item);
        }
    }

    pop(): T | undefined {
        if (this.data.length) return this.data.shift() as T;
        return undefined;
    }
    
    empty(): boolean {
        return this.data.length === 0;
    }
}