// Awaitable, coalescing save queue: navigation waits for in-flight writes AND any
// request made during that write. A failed write stays dirty; retry is explicit.
export class SaveQueue {
  private pending:(()=>Promise<void>)|null=null;
  private running:Promise<void>|null=null;
  enqueue(task:()=>Promise<void>):Promise<void>{
    this.pending=task;
    if(!this.running)this.running=this.drain().finally(()=>{this.running=null;});
    return this.running;
  }
  private async drain(){while(this.pending){const task=this.pending;this.pending=null;try{await task();}catch(e){this.pending=null;throw e;}}}
}
