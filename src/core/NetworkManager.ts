type Message = { type: string; [key: string]: any };

type Handler = (payload: any) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<Handler>> = new Map();
  public playerId: string | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('open', () => this.emit('connected', null));
    this.ws.addEventListener('message', (ev) => {
      try {
        const msg: Message = JSON.parse(ev.data);
        this.emit(msg.type, msg);
      } catch (e) {
        this.emit('error', e);
      }
    });
    this.ws.addEventListener('close', () => {
      this.emit('disconnected', null);
      this.ws = null;
    });
    this.ws.addEventListener('error', (e) => this.emit('error', e));
  }

  close() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  send(msg: Message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  sendJoin(desiredColor?: number) {
    this.send({ type: 'JOIN', desiredColor });
  }

  sendMove(payload: any) {
    this.send({ type: 'MOVE', ...payload });
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, payload: any) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) h(payload);
  }
}

export default NetworkManager;
