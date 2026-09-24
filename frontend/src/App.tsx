import { Component } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams
} from "react-router-dom";
import Bingo from './Bingo';
import * as api from './api/client';

interface AppState {
  gameList: string[] | null;
  newGameId: string;
  newPublic: boolean;
  newError: string;
}

class App extends Component<object, AppState> {
  state: AppState = {
    gameList: null,
    newGameId: '',
    newPublic: true,
    newError: ''
  }

  componentDidMount() {
    api.getGameList()
      .then((games) => this.setState({ gameList: games }))
      .catch(() => this.setState({ gameList: [] }));
  }

  createGame() {
    api.createGame({gameId: this.state.newGameId, isPublic: this.state.newPublic}).then((resp) => {
      if (resp.success) {
        alert('Success! Code is: '+resp.code);
        this.setState({ newGameId: '', newPublic: true, newError: '' });
      } else {
        this.setState({ newError: 'Could not create game (the name may already be taken)' });
      }
    }).catch(() => this.setState({ newError: 'Could not reach the server' }));
  }

  render() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<>
              <h1>Bingo</h1>
              <h2>Game list</h2>
              {this.state.gameList === null ? <p>Loading...</p> : (this.state.gameList.length > 0 ? <ul>{this.state.gameList.map(g => <li key={g}><a href={`/view/${g}`} target="_blank" rel="noopener noreferrer">{g}</a></li>)}</ul> : <p>No game found</p>)}
              <h2>Create new game</h2>
              <p>
                Enter name: <input type="text" maxLength={32} onChange={(e) => this.setState({newGameId: e.target.value.replace(/\W/g, '')})} value={this.state.newGameId} placeholder="Game ID (alphanumeric, no spaces)" /><br />
                <br />
                <input type="checkbox" id="isPublic" checked={this.state.newPublic} onChange={(e) => this.setState({newPublic: e.target.checked})} /><label htmlFor="isPublic">&nbsp;Public game</label>
                <br /><br />
                {this.state.newError.length > 0 ? <span>Error: {this.state.newError}<br /></span> : null}
                &nbsp;<button disabled={this.state.newGameId.length < 1} onClick={() => this.createGame()}>Create!</button>
              </p>
            </>} />
          <Route path="/view/:id" element={<BingoBoard />} />
          <Route path="/control/:id/:code" element={<BingoBoard />} />
        </Routes>
      </Router>
    )
  }
}

function BingoBoard() {
  const { id, code } = useParams();
  const navigate = useNavigate();

  return <Bingo id={id} code={code} onError={() => navigate(`/`, { replace: true })} />;
}

export default App;
