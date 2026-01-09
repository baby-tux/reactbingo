import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams
} from "react-router-dom";
import Bingo from './Bingo';
import api from './api';


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      gameList: null,
      newGameId: '',
      newPublic: true,
      newError: ''
    }
  }

  componentDidMount() {
    api.getGameList().then((findresponse) => {
      this.setState({
        gameList: findresponse.data.games
      });
    });
  }

  createGame() {
    api.createGame({gameId: this.state.newGameId, isPublic: this.state.newPublic}).then((resp) => {
      if (resp.data.success) {
        alert('Success! Code is: '+resp.data.code);
        this.setState({ newGameId: '', newPublic: true });
      } else {
        alert('Could not create game. ');
      }
    });
  }

  render() {
    return (
      <Router>
        <Routes>
          <Route exact path="/" element={<>
              <h1>Bingo</h1>
              <h2>Game list</h2>
              {this.state.gameList === null ? <p>Loading...</p> : (this.state.gameList.length > 0 ? <ul>{this.state.gameList.map(g => <li><a href={`/view/${g}`} target="_blank" rel="noopener noreferrer">{g}</a></li>)}</ul> : <p>No game found</p>)}
              <h2>Create new game</h2>
              <p>
                Enter name: <input type="text" maxLength="32" onChange={(e) => this.setState({newGameId: e.target.value.replace(/\W/g, '')})} value={this.state.newGameId} placeholder="Game ID (alphanumeric, no spaces)" /><br />
                <br />
                <input type="checkbox" id="isPublic" checked={this.state.newPublic} onChange={(e) => this.setState({newPublic: e.target.checked})} /><label htmlFor="isPublic">&nbsp;Public game</label>
                <br /><br />
                {this.state.newError.length > 0 ? <p>Error: {this.state.newError}</p> : null}
                &nbsp;<button disabled={this.state.newGameId.length < 1} onClick={() => this.createGame()}>Create!</button>
              </p>
            </>} />
          <Route path="/view/:id" element={<BingoBoard isControl={false} />} />
          <Route path="/control/:id/:code" element={<BingoBoard isControl={true} />} />
        </Routes>
      </Router>
    )
  }
}

function BingoBoard(props) {
  let {id, code} = useParams();
  let navigate = useNavigate();

  console.log('ID: '+id)

  if (props.isControl) {
    return <Bingo id={id} code={code} onError={() => navigate(`/`, { replace: true })} />;
  } else {
    return <Bingo id={id} onError={() => navigate(`/`, { replace: true })} />;
  }
}

export default App;
