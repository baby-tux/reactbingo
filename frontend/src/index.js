import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Bingo from './Bingo';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<Bingo />, document.getElementById('root'));
registerServiceWorker();
