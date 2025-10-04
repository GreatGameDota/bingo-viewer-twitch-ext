class BingoCanvas extends React.Component {
    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.tooltipRef = React.createRef();
    }
    componentDidMount() { this.renderCanvas(); }
    componentDidUpdate() { this.renderCanvas(); }
    renderCanvas() {
        // Adapted from bingovista.js
        const square = {
            width: 85,
            height: 85,
            margin: 4,
            border: 2,
            color: "#ffffff",
            background: "#020204",
            font: "600 10pt \"Segoe UI\", sans-serif"
        };
        var transpose = true;
        const colors = ["#e60e0e66", "#0080ff66", "#33ff0066", "#ff990066", "#ff00ff66", "#00e8e666", "#5e5e6f66", "#4d00ff66", "#ffffff66"];

        var s = this.props.bingoString;
        s = s.trim().replace(/\s*bChG\s*/g, "bChG");
        var goals = s.split(/bChG/);
        var size = Math.ceil(Math.sqrt(goals.length));

        var board = {};
        board.comments = "Untitled";
        board.character = "Any";
        board.perks = 0;
        board.shelter = "";
        board.mods = [];
        board.size = size;
        board.width = size;
        board.height = size;
        board.goals = [];
        board.toBin = undefined;

        if (goals[0].search(/[A-Za-z]{1,12}[_;]/) == 0) {
            //	Seems 0.86 or 0.90, find which
            if (goals[0].indexOf(";") > 0) {
                board.version = "0.90";
                board.character = goals[0].substring(0, goals[0].indexOf(";"));
                goals[0] = goals[0].substring(goals[0].indexOf(";") + 1);
            } else if (goals[0].indexOf("_") > 0) {
                board.version = "0.86";
                board.character = goals[0].substring(0, goals[0].indexOf("_"));
                goals[0] = goals[0].substring(goals[0].indexOf("_") + 1);
            }
            board.character = BingoEnum_CharToDisplayText[board.character] || "Any";
        } else {
            board.version = "0.85";
        }

        for (var i = 0; i < goals.length; i++) {
            var type, desc;
            if (goals[i].search("~") > 0 && goals[i].search("><") > 0) {
                [type, desc] = goals[i].split("~");
                desc = desc.split(/></);
                if (type === "BingoMoonCloak") type = "BingoMoonCloakChallenge";	//	1.08 hack
                if (CHALLENGES[type] !== undefined) {
                    try {
                        board.goals.push(CHALLENGES[type](desc, board));
                    } catch (er) {
                        board.goals.push(CHALLENGES["BingoChallenge"]([
                            "Error: " + er.message + "; descriptor: " + desc.join("><")]));
                    }
                } else {
                    board.goals.push(CHALLENGES["BingoChallenge"](["Error: unknown type: [" + type + "," + desc.join(",") + "]"]));
                }
            } else {
                board.goals.push(CHALLENGES["BingoChallenge"](["Error extracting goal: " + goals[i]]));
            }
        }

        var canv = this.canvasRef.current;
        square.margin = Math.max(Math.round((canv.width + canv.height) * 2 / ((board.width + board.height) * 91)) * 2, 2);
        square.width = Math.round((canv.width / board.width) - square.margin - square.border);
        square.height = Math.round((canv.height / board.height) - square.margin - square.border);

        var ctx = this.canvasRef.current.getContext("2d");
        ctx.fillStyle = square.background;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (var i = 0; i < board.goals.length; i++) {
            var x, y, t;
            x = Math.floor(i / board.height) * (square.width + square.margin + square.border)
                + (square.border + square.margin) / 2;
            y = (i % board.height) * (square.height + square.margin + square.border)
                + (square.border + square.margin) / 2;
            if (transpose) {
                t = y; y = x; x = t;
            }

            var _colors = [];
            for (var j = 0; j < colors.length; j++) {
                // 1 = goal completed, 2 = goal failed
                if (this.props.boardState[i][j] === '1') {
                    _colors.push(colors[j]);
                }
            }

            if (_colors.length === 1) {
                ctx.fillStyle = _colors[0];
                ctx.fillRect(x, y, square.width, square.height);
            } else if (_colors.length > 1) {
                const numColors = _colors.length;

                // Create clipping region for the square
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "#020204";
                ctx.rect(x, y, square.width, square.height);
                ctx.clip();

                // Calculate stripe width - each color gets equal width
                const stripeWidth = square.width / numColors;
                const slantOffset = square.width * 0.15;

                for (let i = 0; i < numColors; i++) {
                    ctx.fillStyle = _colors[i];

                    // Draw diagonal stripe
                    ctx.beginPath();

                    const stripeLeft = x + i * stripeWidth - (i === 0 ? stripeWidth : 0); // Extend widths of first and last stripes to fill in gaps
                    const stripeRight = x + (i + 1) * stripeWidth + (i === numColors - 1 ? stripeWidth : 0);

                    // Create parallelogram stripe
                    ctx.moveTo(stripeLeft + slantOffset, y);
                    ctx.lineTo(stripeRight + slantOffset, y);
                    ctx.lineTo(stripeRight - slantOffset, y + square.height);
                    ctx.lineTo(stripeLeft - slantOffset, y + square.height);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.restore();
            }

            drawSquare(ctx, board.goals[i], x, y, square);

            // Square outline, only with 1 color
            // This logic doesnt work with
            // BingoItemHoardChallenge, BingoPearlHoardChallenge, BingoCollectPearlChallenge, BingoEchoChallenge, BingoMaulTypesChallenge
            // BingoTameChallenge, BingoGourmandCrushChallenge, BingoLickChallenge
            if (_colors.length === 1 || String(goals[i]).endsWith('1')) {
                if (_colors.length === 0)
                    _colors.push(colors[this.props.team]);
                ctx.beginPath();
                ctx.strokeStyle = _colors[0].substring(0, 7);
                ctx.lineWidth = square.border;
                ctx.roundRect(x, y, square.width, square.height, 4);
                ctx.stroke();
            }
        }

        const TOOLTIP_WIDTH = 220;
        const TOOLTIP_HEIGHT = 50;
        canv.onmousemove = (e) => {
            const rect = canv.getBoundingClientRect();
            let x = Math.floor(e.clientX - Math.round(rect.left)) - (square.border + square.margin) / 2;
            let y = Math.floor(e.clientY - Math.round(rect.top)) - (square.border + square.margin) / 2;
            let mouseX = e.clientX - rect.left;
            let mouseY = e.clientY - rect.top;
            if (transpose) {
                let t = y; y = x; x = t;
            }
            let sqWidth = square.width + square.margin + square.border;
            let sqHeight = square.height + square.margin + square.border;
            let col = Math.floor(x / sqWidth);
            let row = Math.floor(y / sqHeight);
            if (
                x >= 0 && y >= 0 &&
                (x % sqWidth) < (sqWidth - square.margin) &&
                (y % sqHeight) < (sqHeight - square.margin)
            ) {
                const idx = row + col * board.width;
                let left = mouseX - TOOLTIP_WIDTH / 2;
                let top = mouseY + 16;
                if (left + TOOLTIP_WIDTH > 450) left = 450 - TOOLTIP_WIDTH - 4;
                if (left < 4) left = 4;
                if (top + TOOLTIP_HEIGHT > 450) top = 450 - TOOLTIP_HEIGHT - 4;
                if (top < 4) top = 4;
                if (this.tooltipRef.current) {
                    this.tooltipRef.current.style.display = 'block';
                    this.tooltipRef.current.style.left = left + 'px';
                    this.tooltipRef.current.style.top = top + 'px';
                    this.tooltipRef.current.innerHTML = `<span style="font-weight:bold;">${board.goals[idx].category}</span><br><span>${board.goals[idx].description}</span>`;
                }
            } else {
                if (this.tooltipRef.current)
                    this.tooltipRef.current.style.display = 'none';
            }
        };
        canv.onmouseleave = () => {
            if (this.tooltipRef.current)
                this.tooltipRef.current.style.display = 'none';
        };
    }
    render() {
        return React.createElement('div', { style: { position: 'relative' } },
            React.createElement('canvas', {
                ref: this.canvasRef,
                width: "450px",
                height: "450px",
                id: 'board'
            }, 'Canvas support and scripting are required.'),
            React.createElement('div', {
                ref: this.tooltipRef,
                style: {
                    display: 'none',
                    position: 'absolute',
                    width: 220,
                    minHeight: 50,
                    background: 'rgba(30,30,30,0.95)',
                    color: '#fff',
                    padding: '6px 8px 12px 12px',
                    borderRadius: 6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    font: "600 10pt \"Segoe UI\", sans-serif"
                }
            })
        );
    }
}

class App extends React.Component {
    setSocket = (newSocket) => {
        this.props.socket = newSocket;
        this.props.socket.onmessage = async (e) => {
            const text = await e.data.text();
            var data = text.split(";;");
            var _clients = new Map(this.state.clients);
            _clients.set(data[2], { board: data[0], state: data[1], team: data[3] });
            this.setState((prevState) => ({
                messages: [...prevState.messages, text],
                clients: _clients
            }));
            if (data[2] === this.state.selectedClientId) {
                this.setState({
                    s: data[0],
                    boardState: data[1].split("<>"),
                    team: data[3]
                });
            }
        };
    }
    constructor(props) {
        super(props);
        this.state = {
            s: "Gourmand;BingoGourmandCrushChallenge~0><System.Int32|9|Amount|0|NULL><0><0><bChGBingoDontKillChallenge~System.String|DaddyLongLegs|Creature Type|0|creatures><0><0bChGBingoTradeTradedChallenge~0><System.Int32|2|Amount of Items|0|NULL><empty><0><0bChGBingoPearlDeliveryChallenge~System.String|VS|Pearl from Region|0|regions><0><0bChGBingoAchievementChallenge~System.String|Friend|Passage|0|passage><0><0bChGBingoPearlHoardChallenge~System.Boolean|false|Common Pearls|0|NULL><System.Boolean|true|Any Shelter|2|NULL><0><System.Int32|3|Amount|1|NULL><System.String|LF|Region|3|regions><0><0><bChGBingoTradeChallenge~0><System.Int32|12|Value|0|NULL><0><0bChGBingoBombTollChallenge~System.Boolean|false|Specific toll|0|NULL><System.String|su_c02|Scavenger Toll|3|tolls><System.Boolean|false|Pass the Toll|2|NULL><0><System.Int32|3|Amount|1|NULL><empty><0><0bChGBingoDontKillChallenge~System.String|MotherSpider|Creature Type|0|creatures><0><0bChGBingoVistaChallenge~OE><System.String|OE_RUINCourtYard|Room|0|vista><2133><1397><0><0bChGBingoEnterRegionChallenge~System.String|SH|Region|0|regionsreal><0><0bChGBingoEchoChallenge~System.Boolean|false|Specific Echo|0|NULL><System.String|CC|Region|1|echoes><System.Boolean|false|While Starving|3|NULL><0><System.Int32|5|Amount|2|NULL><0><0><bChGBingoMoonCloakChallenge~System.Boolean|true|Deliver|0|NULL><0><0bChGBingoCraftChallenge~System.String|Lantern|Item to Craft|0|craft><System.Int32|3|Amount|1|NULL><0><0><0bChGBingoAchievementChallenge~System.String|Hunter|Passage|0|passage><0><0bChGBingoCycleScoreChallenge~System.Int32|25|Target Score|0|NULL><0><0bChGBingoDodgeLeviathanChallenge~0><0bChGBingoDodgeNootChallenge~System.Int32|6|Amount|0|NULL><0><0><0bChGBingoUnlockChallenge~System.String|SI|Unlock|0|unlocks><0><0bChGBingoCraftChallenge~System.String|FirecrackerPlant|Item to Craft|0|craft><System.Int32|2|Amount|1|NULL><0><0><0bChGBingoAllRegionsExcept~System.String|SU|Region|0|regionsreal><CC|DS|HI|GW|SI|SU|SH|SL|LF|UW|SB|SS|MS|OE|HR|LM|DM|LC|RM|CL|UG|VS><0><System.Int32|9|Amount|1|NULL><0><0bChGBingoCreatureGateChallenge~System.String|CicadaB|Creature Type|1|transport><0><System.Int32|4|Amount|0|NULL><empty><0><0bChGBingoVistaChallenge~SH><System.String|SH_A14|Room|0|vista><273><556><0><0bChGBingoLickChallenge~0><System.Int32|3|Amount|0|NULL><0><0><bChGBingoPopcornChallenge~0><System.Int32|2|Amount|0|NULL><0><0",
            boardState: "000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>001000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>000000000<>111110000<>000000000".split("<>"),
            team: null,
            messages: [],
            clients: new Map(),
            selectedClientId: null,
            connected: false,
            showBoard: false,
            showDropdown: false,
        };
        if (this.props.socket) {
            this.setSocket(this.props.socket);
        }
        this.dropdownRef = React.createRef();
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }
    handleClickOutside(event) {
        if (this.dropdownRef.current && !this.dropdownRef.current.contains(event.target)) {
            this.setState({ showDropdown: false });
        }
    }
    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }
    async componentDidMount() {
        document.addEventListener('mousedown', this.handleClickOutside);
        // Adapted from bingovista.js
        //	Prepare atlases
        atlases[0].img = "./lib/bingovista/bvicons.png";
        atlases[0].txt = "./lib/bingovista/bvicons.txt";
        atlases[1].img = "./lib/bingovista/bingoicons.png";
        atlases[1].txt = "./lib/bingovista/bingoicons.txt";
        atlases[2].img = "./lib/bingovista/uispritesmsc.png";
        atlases[2].txt = "./lib/bingovista/uispritesmsc.txt";
        atlases[3].img = "./lib/bingovista/uiSprites.png";
        atlases[3].txt = "./lib/bingovista/uiSprites.txt";

        function loadImage(src, dest) {
            return new Promise(function (resolve, reject) {
                var img = document.createElement("img");
                img.addEventListener("load", function () {
                    var canv = document.createElement("canvas");
                    canv.width = img.naturalWidth; canv.height = img.naturalHeight;
                    var ctx = canv.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    dest.canv = canv;
                    resolve();
                });
                img.crossOrigin = "anonymous";
                img.addEventListener("error", () => reject({ message: "Error loading image " + src + "." }));
                img.src = src;
            });
        }

        function loadJson(src, dest) {
            return fetch(src).then(function (response, reject) {
                if (!response.ok)
                    return reject(new DOMException("URL " + response.url + " error " + response.status + " " + response.statusText + ".", "NetworkError"));
                return response.text();
            }).catch((e) => {
                return Promise.reject(e);
            }).then((s) => {
                dest.frames = JSON.parse(s).frames;
            });
        }

        function loadClosure(s, d, f) {
            return f(s, d);
        }

        var loaders = [];
        for (var i = 0; i < atlases.length; i++) {
            loaders.push(loadClosure(atlases[i].img, atlases[i], loadImage));
        };
        for (var i = 0; i < atlases.length; i++) {
            loaders.push(loadClosure(atlases[i].txt, atlases[i], loadJson));
        };
        Promise.all(loaders).catch(function (e) {
            console.log("Promise.all(): failed to complete fetches. Error: " + e.message);
        }).finally(() => this.setState({ loading: false }));
    }
    handleClientChange = (e) => {
        const clientId = e.target.innerText;
        const client = this.state.clients.get(clientId);
        this.setState({
            selectedClientId: clientId,
            s: client ? client.board : this.state.s,
            boardState: client ? client.state.split("<>") : this.state.boardState,
            team: client ? client.team : this.state.team
        });
    };
    toggleBoard = () => {
        this.setState((prevState) => ({ showBoard: !prevState.showBoard }));
    };
    toggleDropdown = () => {
        this.setState((prevState) => ({ showDropdown: !prevState.showDropdown }));
    };
    render() {
        const clientOptions = Array.from(this.state.clients.keys()).map(id => (
            React.createElement('div', { key: id, value: id, onClick: (e) => { this.toggleDropdown(), this.handleClientChange(e) } }, id)
        ));
        return React.createElement('div', { style: { backgroundColor: "#181a1b00", color: "white", width: "fit-content", marginLeft: "auto", marginRight: "64px", marginTop: "24px" } },
            React.createElement('div', { style: { padding: "4px", display: "flex", flexDirection: "row" } },
                React.createElement('div', { style: { marginRight: "8px", display: "flex", flexDirection: "column", height: "fit" } },
                    this.state.showBoard && React.createElement('div', { ref: this.dropdownRef, className: "custom-select", style: { padding: "8px", background: "#0a0a0a", borderRadius: "8px" } },
                        React.createElement('div', { className: "select-selected", onClick: this.toggleDropdown },
                            this.state.selectedClientId || "Select a player"
                        ),
                        React.createElement('div', { style: { padding: "4px", background: "#0a0a0a", borderRadius: "12px", position: "absolute", top: "calc(100%)", left: 0, right: 0, zIndex: 99, display: this.state.showDropdown ? "block" : "none" } },
                            React.createElement('div', { className: "select-items" },
                                clientOptions.length === 0 ? React.createElement('div', { value: "", disabled: true, style: { fontStyle: "italic" }, onClick: this.toggleDropdown }, 'No players') : React.createElement('div', { value: "", disabled: true, style: { fontStyle: "italic" } }, 'Select a player'),
                                ...clientOptions
                            )
                        )
                    ),
                    React.createElement('div', { style: { background: "#1a1a1a", padding: "4px", marginTop: this.state.showBoard ? "8px" : "25vh", fontSize: "16px", opacity: this.state.showBoard ? 1 : 0.5, maxWidth: "fit-content", borderRadius: "8px" } },
                        React.createElement('div', { className: "button-wrapper" },
                            React.createElement('button', {
                                className: "back-button",
                                onClick: this.toggleBoard
                            }, this.state.showBoard ? "Hide Board" : "Show Board")
                        )
                    )
                ),
                this.state.showBoard && React.createElement(BingoCanvas, {
                    bingoString: this.state.s,
                    boardState: this.state.boardState,
                    team: this.state.team
                })
            )
        );
    }
}

window.addEventListener('DOMContentLoaded', function () {
    let ws;
    let reconnectTimeout = null;
    let appInstance = null;
    const connect = () => {
        ws = new WebSocket("wss://rw-bingo-board-viewer.onrender.com");
        ws.onclose = () => {
            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    connect();
                }, 2000);
            }
        };
        ws.onerror = () => {
            ws.close();
        };
        ws.onopen = () => {
            ws.send("Spectator connected");
            if (appInstance == null) {
                ReactDOM.render(
                    React.createElement(App, { socket: ws, ref: (ref) => { appInstance = ref; } }),
                    document.getElementById('root')
                );
            } else {
                appInstance.setSocket(ws);
            }
        };
    };
    connect();
});
