import React, { Component } from 'react';
import undoicon from './undo.svg';
import redoicon from './redo.svg';
import reseticon from './reset.svg';
import patterns from './patterns';
import api from './api';


//Websocket stuff
const HEARTBEAT_INTERVAL = 25000;
const HEARTBEAT_TIMEOUT = 10000;
const MAX_RECONNECT_DELAY = 30000;

function socketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/api/`;
}

function newPushId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// eslint-disable-next-line
Object.defineProperty(Array.prototype, 'flatten', {
    value: function(depth = 1) {
      return this.reduce(function (flat, toFlatten) {
        return flat.concat((Array.isArray(toFlatten) && (depth-1)) ? toFlatten.flat(depth-1) : toFlatten);
      }, []);
    }
});

function BoardNumber(props) {
  return (
    <button className={props.last ? "board-number board-number-active" : props.viewMode ? "board-number board-number-view" : "board-number"} onClick={props.onClick} disabled={props.disabled}>
      {props.value}
    </button>
  );
}


function Board(props) {
  let numbers = [];
  for (let i = 1; i <= 75; i++)
    numbers.push(<BoardNumber value={i} key={i} disabled={props.pickedNumbers.indexOf(i) >= 0 ? "disabled" : ""} last={props.pickedNumbers.length > 0 && props.pickedNumbers[props.pickedNumbers.length-1] === i} onClick={() => props.onNumberClick(i)} viewMode={props.viewMode} />);

  return (
    <div className="game-board">
      <div className="board-row"><div className="board-letter">B</div>{numbers.slice(0,15)}</div>
      <div className="board-row"><div className="board-letter">I</div>{numbers.slice(15,30)}</div>
      <div className="board-row"><div className="board-letter">N</div>{numbers.slice(30,45)}</div>
      <div className="board-row"><div className="board-letter">G</div>{numbers.slice(45,60)}</div>
      <div className="board-row"><div className="board-letter">O</div>{numbers.slice(60,75)}</div>
    </div>
  );
}

function DisplayNumber(props) {
    if (props.value <= 15)
      return (<span>B {props.value}</span>);
    if (props.value <= 30)
      return (<span>I {props.value}</span>);
    if (props.value <= 45)
      return (<span>N {props.value}</span>);
    if (props.value <= 60)
      return (<span>G {props.value}</span>);
    else
      return (<span>O {props.value}</span>);
}

function DisplayLastNumbers(props) {
  let lastNumbers = [];
  for (let i=props.numbers.length-2; i>=Math.max(props.numbers.length-5, 0); i--) {
    lastNumbers.push(<div key={i}><DisplayNumber value={props.numbers[i]} /></div>);
  }
  if (lastNumbers.length === 0) lastNumbers.push(<div key={-1}>&nbsp;</div>);

  return (
    <div className="last-numbers">
      <div className="previous-numbers">
        {lastNumbers}
      </div>
      <div className="current-number">
        {props.numbers.length > 0 ? <DisplayNumber value={props.numbers[props.numbers.length-1]} /> : ""}
      </div>
    </div>
  );
}

function CardNumberInput(props) {
 let numbers = [];
 for (let i = 0; i <= 9; i++)
   numbers.push(<button key={i} onClick={() => document.getElementById("cardnumber").value += i}>{i}</button>);

 return (
   <div className="card-number-input">
      <div className="number-display">Card #: <input type="text" id="cardnumber" pattern="[0-9]*" size="4" onKeyUp={(e) => {if (e.key === "Enter") props.onValidate(document.getElementById("cardnumber").value)}} /></div>
      {numbers.slice(1,4)}<br />
      {numbers.slice(4,7)}<br />
      {numbers.slice(7,10)}<br />
      <button onClick={() => document.getElementById("cardnumber").value = ''}>C</button>{numbers[0]}<button onClick={() => props.onValidate(document.getElementById("cardnumber").value)}>✔</button>
    </div>
 );
}

function ValidationCard(props) {
  let numbers = [];
  let letters = ["b","i","n","g","o"];
  for (let i=1; i<=5; i++) {
    let numberRow = [];
    for (let l in letters) {
      let pos = letters[l]+i;

      let className = "cardCell";
      if (props.result[pos].isOnPattern)
        className = "cardCell cardCellHighlighted";
      else if (props.result[pos].isDrawn)
        className = "cardCell cardCellSelected";

      let number = pos === 'n3' ? '★' : props.result[pos].number;

      numberRow.push(<div className={className} key={pos}>{number}</div>);
    }
    numbers.push(<div className="cardRow" key={i}>{numberRow}</div>);
  }

  return (
    <div className="card-table">
      <div className="cardTHead"><div className="cardRow"><div className="cardHead">B</div><div className="cardHead">I</div><div className="cardHead">N</div><div className="cardHead">G</div><div className="cardHead cardLastCell">O</div></div></div>
      <div className="cardTBody">
        {numbers}
      </div>
    </div>
  );
}

function BingoType(props) {
  let buttonClass = "";
  if (props.selected)
    buttonClass = "bingoTypeSelected";
  else if (props.highlighted)
    buttonClass = "bingoTypeHighlighted";
  else if (props.current)
    buttonClass = "bingoTypeCurrent";

  let patternImgIndex = patterns.findIndex(p => p.name === props.name);
  return (
    <div className="bingoType"><button className={buttonClass} disabled={props.disabled ? "disabled" : ""} onClick={props.onChange}>{patternImgIndex !== -1 ? <img src={patterns[patternImgIndex].src} alt={props.name} /> : props.name}</button></div>
  );
}

class BingoTypes extends Component {
 constructor(props) {
    super(props);
    this.state = {
      selectedTypes: []
    }
  }

  typeToggle(t)
  {
    if (this.props.enabled && this.props.highlightedTypes.length === 0 && this.props.currentPatterns.indexOf(t) === -1)
      this.setState({
        selectedTypes: this.state.selectedTypes.indexOf(t) >= 0 ? this.state.selectedTypes.filter((v) => v !== t) : this.state.selectedTypes.concat(t)
      });
  }

  validate(isContinue)
  {
    this.props.onValidate(this.props.highlightedTypes.length > 0 ? this.props.highlightedTypes : this.state.selectedTypes, isContinue);
    this.setState({
      selectedTypes: []
    });
  }

  cancel()
  {
    this.setState({
      selectedTypes: []
    });

    this.props.onCancel();
  }

  render() {
    return (
     <div>
      <div className="bingo-types">
        {this.props.types.map((l, i) => <div className="bingo-types-line" key={i}>{l.map((t, index) => <BingoType key={index} name={t} onChange={() => this.typeToggle(t)} selected={this.state.selectedTypes.indexOf(t) >= 0} disabled={this.props.validatedTypes.indexOf(t) >= 0} highlighted={this.props.highlightedTypes.indexOf(t) >= 0} current={this.props.currentPatterns.indexOf(t) >= 0} />)}</div>)}
      </div>
      <div className="bingo-types-buttons" style={this.props.enabled ? {} : {display: 'none'}}>
          <button disabled={this.state.selectedTypes.length === 0 && this.props.highlightedTypes.length === 0 ? "disabled" : ""} onClick={() => this.validate(false)}>✔</button>&nbsp;
          <button onClick={() => this.cancel()}>✖</button>&nbsp;<button className="smalltext" disabled={this.props.continueAvailable ? null : "disabled"} onClick={() => this.validate(true)}><img alt="Other bingo" src={reseticon} /></button>
      </div>
     </div>
    );
  }
}

function ConnectionStatus(props) {
  let message = null;
  if (props.syncError === 'unauthorized')
    message = 'Invalid control code: changes are not saved';
  else if (props.connection === 'connecting')
    message = 'Connecting…';
  else if (props.connection === 'closed')
    message = props.viewMode ? 'Disconnected, retrying…' : 'Disconnected, retrying… Changes will sync when reconnected';
  else if (props.syncError)
    message = 'Last change could not be saved';

  if (message === null) return null;

  return (
    <div className="connection-status">
      {message}
      {props.connection === 'closed' ? <button onClick={props.onReconnect}>Reconnect</button> : null}
    </div>
  );
}

class Bingo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      eventHistory: [],
      eventPosition: 0,
      bingo: false,
      availablePatterns: [],
      validationResult: null,
      validatedPatterns: [],
      connection: 'connecting',
      syncError: null,
    }

    this.ws = null;
    this.retries = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.hasLoaded = false;   // received the game state at least once
    this.registered = false;  // current socket received the game state
    this.revision = 0;        // server revision the local state is based on
    this.dirty = false;       // local changes not yet sent
    this.pendingPush = null;  // {pushId, lost} of the push awaiting ack
    this.blocked = false;     // server rejected the control code
  }

  updateState(findresponse) {
      this.setState({
        eventHistory: findresponse.eventHistory,
        eventPosition: findresponse.eventPosition,
        bingo: findresponse.bingo,
        validationResult: findresponse.validationResult,
        validatedPatterns: findresponse.validatedPatterns,
      })
  }

  componentDidMount() {
    api.getPatterns().then((findresponse) => {
      this.setState({
        availablePatterns: findresponse.data,
      })
    })

    this.unmounted = false;
    document.addEventListener('visibilitychange', this.handleWake);
    window.addEventListener('online', this.handleWake);
    this.connect();
  }

  componentWillUnmount() {
    this.unmounted = true;
    document.removeEventListener('visibilitychange', this.handleWake);
    window.removeEventListener('online', this.handleWake);
    this.teardownSocket();
  }

  connect() {
    clearTimeout(this.reconnectTimer);
    const ws = new WebSocket(socketUrl());
    this.ws = ws;
    this.setState({ connection: 'connecting' });

    ws.onopen = () => {
      this.retries = 0;
      this.setState({ connection: 'open' });
      this.send({ action: 'register', gameId: this.props.id });
      this.heartbeatTimer = setInterval(() => this.checkAlive(), HEARTBEAT_INTERVAL);
    };
    ws.onmessage = (event) => this.handleMessage(event.data);
    ws.onerror = () => ws.close();
    ws.onclose = () => this.handleDisconnect();
  }

  teardownSocket() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
    this.pongTimer = null;
    this.registered = false;
    // We can't know whether an unacknowledged push reached the server; the next state received tells
    if (this.pendingPush) this.pendingPush.lost = true;

    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onerror = this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  handleDisconnect() {
    this.teardownSocket();
    if (this.unmounted) return;

    this.setState({ connection: 'closed' });
    const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * 2 ** this.retries++) + Math.random() * 500;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  reconnectNow() {
    this.retries = 0;
    this.teardownSocket();
    this.connect();
  }

  handleWake = () => {
    if (document.visibilityState !== 'visible') return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.checkAlive();
    else if (this.ws === null || this.ws.readyState !== WebSocket.CONNECTING) this.reconnectNow();
  }

  // Browsers don't expose protocol pings, so detect half-open connections with an app-level ping
  checkAlive() {
    if (this.pongTimer || !this.send({ action: 'ping' })) return;
    this.pongTimer = setTimeout(() => this.handleDisconnect(), HEARTBEAT_TIMEOUT);
  }

  send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  handleMessage(data) {
    // Any message proves the connection is alive
    clearTimeout(this.pongTimer);
    this.pongTimer = null;

    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.error('Invalid message from server', data);
      return;
    }

    const isPendingPush = this.pendingPush !== null && this.pendingPush.pushId === msg.pushId;
    switch (msg.type) {
      case 'state':
        this.receiveState(msg.state);
        break;
      case 'ack':
        if (!isPendingPush) break;
        this.pendingPush = null;
        this.revision = msg.revision;
        if (this.state.syncError) this.setState({ syncError: null });
        this.flush();
        break;
      case 'conflict':
        if (!isPendingPush) break;
        this.pendingPush = null;
        this.dirty = true;
        this.reconcile(msg.state);
        break;
      case 'notFound':
        alert('Game not found!');
        this.props.onError();
        break;
      case 'error':
        console.error('Server error:', msg.error);
        if (isPendingPush) {
          this.pendingPush = null;
          this.dirty = true;
        }
        if (msg.error === 'unauthorized') {
          this.blocked = true;
          this.dirty = false;
        }
        this.setState({ syncError: msg.error });
        break;
      case 'pong':
        break;
      default:
        console.warn('Unknown message from server', msg);
    }
  }

  receiveState(doc) {
    this.registered = true;

    if (this.pendingPush) {
      if (doc.lastPushId === this.pendingPush.pushId) {
        // Our push was saved before the connection dropped
        this.pendingPush = null;
        this.revision = doc.revision;
        this.flush();
        return;
      }
      // A broadcast raced our push: the ack or conflict for it will follow
      if (!this.pendingPush.lost) return;
      // The lost push never reached the server
      this.pendingPush = null;
      this.dirty = true;
    }

    this.reconcile(doc);
  }

  reconcile(doc) {
    if (!this.hasLoaded) {
      this.hasLoaded = true;
      this.dirty = false;
    }

    if (this.dirty && doc.revision !== this.revision && !window.confirm(
      "This game was changed from somewhere else before your latest changes were saved.\n\n" +
      "OK: overwrite it with your version\nCancel: discard your changes and load the other version")) {
      this.dirty = false;
    }

    this.revision = doc.revision;
    if (this.dirty) this.flush();
    else this.updateState(doc);
  }

  pushState() {
    if (this.isViewMode() || this.blocked) return;
    this.dirty = true;
    this.flush();
  }

  // Sends local state if there are unsent changes and no push is awaiting acknowledgement
  flush() {
    if (this.isViewMode() || this.blocked || !this.dirty || this.pendingPush || !this.registered) return;

    const pushId = newPushId();
    const sent = this.send({
      action: 'push',
      gameId: this.props.id,
      code: this.props.code,
      pushId: pushId,
      baseRevision: this.revision,
      state: {
        eventHistory: this.state.eventHistory,
        eventPosition: this.state.eventPosition,
        bingo: this.state.bingo,
        validationResult: this.state.validationResult,
        validatedPatterns: this.state.validatedPatterns,
      }
    });
    if (!sent) return;

    this.pendingPush = { pushId: pushId, lost: false };
    this.dirty = false;
  }

  handleNumberClick(i) {
    if (this.isViewMode()) return;
    if (this.state.bingo)
    {
      alert('In bingo mode');
      return;
    }

    const events = this.state.eventHistory.slice(0, this.state.eventPosition).concat({number: i, patterns: []});

    this.setState({
      eventHistory: events,
      eventPosition: this.state.eventPosition+1
    }, () => { this.pushState(); });
  }

  undo() {
    if (this.state.bingo)
    {
      alert('In bingo mode');
      return;
    }

    let newEventPosition = this.state.eventPosition-1;
    this.setState({
      eventPosition: newEventPosition,
    }, () => { this.pushState(); });
  }

  redo() {
    if (this.state.bingo)
    {
      alert('In bingo mode');
      return;
    }

    let newEventPosition = this.state.eventPosition+1;
    this.setState({
      eventPosition: newEventPosition
    }, () => { this.pushState(); });
  }

  resetNumbers() {
    if (!window.confirm("Reset?")) return;

    this.setState({
      eventHistory: [],
      eventPosition: 0,
      bingo: false,
      validationResult: null,
      validatedPatterns: [],
    }, () => { this.pushState(); });
  }

  bingo(state) {
    this.setState({
      bingo: state,
      validationResult: null,
      validatedPatterns: []
    }, () => { this.pushState(); });
  }

  setPatterns(t, keepBingoMode) {
    const events = [...this.state.eventHistory.slice(0, this.state.eventPosition), {number: null, patterns: t}];
    let newEventPosition = this.state.eventPosition+1;

    this.setState({
      eventHistory: events,
      eventPosition: newEventPosition,
      bingo: keepBingoMode,
      validationResult: null,
      validatedPatterns: [],
    }, () => { this.pushState(); });
  }

  getNumbers() {
    return this.state.eventHistory.slice(0, this.state.eventPosition).filter((v) => v.number !== null).map((v) => v.number);
  }

  getLastNumberIndex() {
    return this.state.eventHistory.slice(0, this.state.eventPosition).map(v => v.number !== null).lastIndexOf(true);
  }

  getValidatedPatterns() {
    return this.state.eventHistory.slice(0, this.getLastNumberIndex()).map((v) => v.patterns).flatten();
  }

  getCurrentPatterns() {
    return this.state.eventHistory.slice(this.getLastNumberIndex(), this.state.eventPosition).map((v) => v.patterns).flatten();
  }

  checkCard(n) {
    api.validateCard({
        numbers: this.getNumbers(),
        patterns: this.state.availablePatterns.flatten().filter(p => this.getValidatedPatterns().indexOf(p) === -1),
        cardNumber: n
    }).then((findresponse) => {
      if (!findresponse.data.isValid)
      {
        alert('Invalid card number');
      }
      else
      {
        this.setState({
          validationResult: findresponse.data.result,
          validatedPatterns: findresponse.data.patterns,
        }, () => { this.pushState(); });
      }
    });
  }

  isViewMode() {
    return this.props.code === undefined;
  }

  render() {
    return (
      <div className="Bingo">
        <ConnectionStatus connection={this.state.connection} syncError={this.state.syncError} viewMode={this.isViewMode()} onReconnect={() => this.reconnectNow()} />
        <Board pickedNumbers={this.getNumbers()} onNumberClick={(i) => this.handleNumberClick(i)} viewMode={this.isViewMode()} />
        <div className="info-sections">
          <DisplayLastNumbers numbers={this.getNumbers()} />
          <div className="buttons" style={this.isViewMode() ? {display: 'none'} : {}}>
            <button onClick={() => this.undo()} disabled={this.state.eventPosition <= 0 ? "disabled" : ""}><img alt="Undo" src={undoicon} /></button>
            <button onClick={() => this.redo()} disabled={this.state.eventPosition >= this.state.eventHistory.length ? "disabled" : ""}><img alt="Redo" src={redoicon} /></button>
            <button onClick={() => this.resetNumbers()}><img alt="Reset" src={reseticon} /></button>
          </div>
        </div>
        <div className="bingo-validation">
          { this.state.validationResult !== null ? <ValidationCard result={this.state.validationResult} /> : this.state.bingo && !this.isViewMode() ? <CardNumberInput onValidate={(i) => this.checkCard(i)} /> : null }
        </div>
	<div className="bingo-status">
          { this.state.bingo && this.isViewMode() && this.state.validationResult === null ?
            <div className="bingo-message">Bingo!</div>
	  : <BingoTypes types={this.state.availablePatterns} onValidate={(t, b) => this.setPatterns(t, b)} enabled={this.state.bingo && !this.isViewMode()} onCancel={() => this.bingo(false)} validatedTypes={this.getValidatedPatterns()} currentPatterns={this.getCurrentPatterns()} highlightedTypes={this.state.validatedPatterns} continueAvailable={this.state.validationResult !== null} />
          }
          { !this.state.bingo && !this.isViewMode() ? <div><button onClick={() => this.bingo(true)} disabled={this.state.eventPosition > 0 ? null : "disabled"} className="bingoButton">Bingo</button></div> : "" }
        </div>
      </div>
    );
  }
}

export default Bingo;
