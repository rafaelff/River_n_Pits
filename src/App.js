import React, { Component } from 'react';
import './App.css';
import './themes/default/game.css';
import './themes/default/board.css';

// Function to create multidimensional arrays
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    } else {
		while(i--) arr[length-1 - i] = null;
	}

    return arr;
}

class App extends Component {
  render() {
    return (
		<Game
			lines="8"
			cols="8"
		/>
    );
  }
}

function Tile(props) {
	return (
		<button
			className={props.type + ' ' + props.className}
			onClick={props.onClick}
			position={props.line + '.' + props.col}
		>
			{props.value}
		</button>
	);
}

class Board extends React.Component {

	renderLine(i) {
		const tiles = this.props.board.tiles[i];
		const vWalls = this.props.board.vWalls[i];
		
		let line = [];
		line.push(this.renderTile('vWall',vWalls[0],i,0));
		for(let j = 0; j < tiles.length; j++) {
			line.push(this.renderTile('tile',tiles[j],i,j));
			line.push(this.renderTile('vWall',vWalls[j+1],i,j+1));
		}

		return (
			<div className="tileRow">
				{line}
			</div>
		);
	}
	
	renderHorizontalWalls(i) {
		const hWalls = this.props.board.hWalls[i];
		
		let line = [];
		for(let j = 0; j < hWalls.length; j++) {
			line.push(this.renderTile('hWall',hWalls[j],i,j));
		}
		
		return (
			<div className="wallRow">
				{line}
			</div>
		);
	}
	
	renderTile(type, role, i, j) {
		let className = '';
		if(typeof role === "number") {
			if(role === -1) { // -1 is outer wall, other numbers are the index of the tile tool
				className = "outerWall";
			} else {
				className = this.props.tiles[role]["action"];
			}
		}
		return (
			<Tile
				type={type}
				className={className}
				line={i}
				col={j}
				onClick={() => this.props.onClick(type, role, i, j)}
			/>
		);
	}
	
	render() {
		let board = [];
		if(!this.props.board.tiles.length) return null;
		if(!this.props.board.hWalls.length) return null;
		if(!this.props.board.vWalls.length) return null;
		
		board.push(this.renderHorizontalWalls(0));
		for(let i = 0; i < this.props.board.tiles.length; i++) {
			board.push(this.renderLine(i));
			board.push(this.renderHorizontalWalls(i+1));
		}
		
		return (
			<div className="board">
				{board}
			</div>
		);
	}
}

function Tools(props) { //-------------------- Make translateable the "Erase" word here
	let tools = [
		<li
			className={props.currentTool === null ? "selected" : ""}
			onClick={() => props.onClick(null)}>
			<span className="tool empty" />Erase
		</li>
	];
	if(typeof props.tiles === "object" && typeof props.numTiles === "object") {
		props.tiles.forEach((e, i) => {
			let placed = 0;
			if(typeof props.numTiles[i] === "number") {
				placed = props.numTiles[i];
			}
			let className = "";
			if(placed === e.num) {
				className = "full";
			} else if(placed >= e.num) {
				className = "over";
			}
			if(i === props.currentTool) {
				className += " selected";
			}
			
			tools.push(
				<li
					className={className}
					onClick={() => props.onClick(i)}>
					<span className={"tool " + e.action} />
					{e.name} ({placed}/{e.num})
					<span className="icon" />
				</li>
			);
		});
		
		return (
			<ul className="toolBox">
				{tools}
			</ul>
		);
	} else return null;
}

class Game extends React.Component {
	constructor(props) {
		super(props);
		
		// Create the arrays with tiles data
		let tiles = createArray(props.lines, props.cols);
		let vWalls = createArray(props.lines, Number(props.cols) + 1);
		let hWalls = createArray(Number(props.lines) + 1, props.cols);
		
		// Fill the grid with the outer walls
		vWalls.forEach((e) => {
			e[0] = -1;
			e[this.props.cols] = -1;
		});
		hWalls = hWalls.map((e, i) => {
			if(i === 0 || i === Number(this.props.lines)) {
				return e.map((j) => {
					return -1;
				});
			}
			return e;
		});
		
		// Define the tiles available to place
		// Later, those will load from an external file
		this.allowedTiles = [{
			name: 'Walls',
			num: 15,
			action: 'wall'
		},{
			name: 'Linear Pit',
			num: 2,
			action: 'pit'
		},{
			name: 'Triangular Pit',
			num: 3,
			action: 'pit'
		},{
			name: 'River',
			num: 4,
			action: 'river',
			rule: 'connected river'
		},{
			name: 'River Delta',
			num: 1,
			action: 'river delta',
			rule: 'connected river'
		},{
			name: 'Crocodile',
			num: 1,
			action: 'damage',
			rule: 'connected delta'
		},{
			name: 'Store',
			num: 1,
			action: 'store',
			rule: 'acessible'
		},{
			name: 'Fake Treasure',
			num: 1,
			action: 'treasure false'
		},{
			name: 'Real Treasure',
			num: 1,
			action: 'treasure true'
		},{
			name: 'Exit',
			num: 1,
			action: 'exit'
		}];
		
		// Set the state
		this.state = {
			history: [{
				tiles: tiles,
				vWalls: vWalls,
				hWalls: hWalls,
				numTiles: Array(this.allowedTiles.length).fill(0),
			}],
			stepNumber: 0,
			currentTool: null,
		};
	}
	
	selectTool(i) {
		this.setState({currentTool: i});
	}
	
	placeTile(type, role, i, j) {
		const history = this.state.history.slice();
		const tool = this.state.currentTool;
		let board = history[this.state.stepNumber];
		type += "s";
		let current = board[type][i][j];
		
		// Do nothing if the same tool is applyed to a tile
		if(current === tool) return;
		// Do nothing if an outer wall is selected
		if(current === -1) return;
		
		// Do nothing if selecting a tile with the wall tool
		if(tool !== null && this.allowedTiles[tool]["action"] === "wall" && type.substring(1) !== "Walls") {console.log('1'); return;}
		// Do nothing if selecting a wall without the wall or erase tool
		if(tool !== null && this.allowedTiles[tool]["action"] !== "wall" && type.substring(1) === "Walls") {console.log('2'); return;}
		
		// Change the count of placed tiles
		if(tool !== null) {
			board.numTiles[tool]++;
		}
		if(current !== null) {
			board.numTiles[current]--;
		}
		
		// Set the new tile and update the history
		board[type][i][j] = tool;
		this.setState({
			history: history.concat(board),
			stepNumber: history.length,
		});
	}
	
	render() {
		const history = this.state.history;
		const current = history[this.state.stepNumber];
		
		return (
			<div className="game">
				<Board 
					board={current}
					tiles={this.allowedTiles}
					onClick={(type, role, i, j) => this.placeTile(type, role, i, j)}
				/>
				<Tools 
					tiles={this.allowedTiles}
					numTiles={current.numTiles}
					onClick={(e) => this.selectTool(e)}
					currentTool={this.state.currentTool}
				/>
			</div>
		);
	}
}

export default App;