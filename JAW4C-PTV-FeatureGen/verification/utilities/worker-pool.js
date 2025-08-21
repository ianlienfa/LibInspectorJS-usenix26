const { Worker } = require('worker_threads');
const os = require('os');

class WorkerPool {
    constructor(workerScript, poolSize = os.cpus().length) {
        this.workerScript = workerScript;
        this.poolSize = poolSize;
        this.workers = [];
        this.queue = [];
        this.activeJobs = 0;
        
        // Initialize workers
        for (let i = 0; i < poolSize; i++) {
            this.createWorker();
        }
    }
    
    createWorker() {
        const worker = new Worker(this.workerScript);
        worker.isIdle = true;
        
        worker.on('message', (result) => {
            worker.isIdle = true;
            this.activeJobs--;
            
            if (result.error) {
                worker.currentResolve.reject(new Error(result.error));
            } else {
                worker.currentResolve.resolve(result.data);
            }
            
            // Process next job in queue
            this.processQueue();
        });
        
        worker.on('error', (error) => {
            worker.isIdle = true;
            this.activeJobs--;
            worker.currentResolve.reject(error);
            this.processQueue();
        });
        
        this.workers.push(worker);
        return worker;
    }
    
    execute(data) {
        return new Promise((resolve, reject) => {
            this.queue.push({ data, resolve, reject });
            this.processQueue();
        });
    }
    
    processQueue() {
        if (this.queue.length === 0) return;
        
        const idleWorker = this.workers.find(w => w.isIdle);
        if (!idleWorker) return;
        
        const job = this.queue.shift();
        idleWorker.isIdle = false;
        idleWorker.currentResolve = { resolve: job.resolve, reject: job.reject };
        this.activeJobs++;
        
        idleWorker.postMessage(job.data);
    }
    
    async executeAll(tasks) {
        const promises = tasks.map(task => this.execute(task));
        return Promise.all(promises);
    }
    
    async close() {
        await Promise.all(this.workers.map(worker => {
            return new Promise((resolve) => {
                worker.terminate().then(resolve);
            });
        }));
    }
}

module.exports = WorkerPool;