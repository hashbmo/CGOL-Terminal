// Canvas Config
const canvas = document.getElementById("Canvas");
var ctx = canvas.getContext("2d");
var c_width = canvas.width;
var c_height = canvas.height;
var canvas_hovered = false, canvas_focused = false;

// Console Config / Declarations
const doc_console = document.querySelector(".console")
const cons_input = document.querySelector(".console-input")
const history = document.querySelector(".console-history")
const logs = []

// Globals
var simul_func = NaN, running = false

// Canvas Focus Handlers
canvas.addEventListener("mouseleave", (ev)=>{canvas_hovered=false}, false)
canvas.addEventListener("mouseover", (ev)=>{canvas_hovered=true}, false)

// Returns the number of occurences of a given item in an array
function count(arr, val) {
    let count = 0
    for (let x of arr) { if (x == val) {count++} }
    return count
}

// Creates a new grid given a width, height and an optional fill parameter (Fill specifies what to place in empty grid locations)
function create_grid(width = 4, height = 4, fill = 0) {
    let grid = []
    for (let y = 0; y < height; y++) {
        grid[y] = []
        for (let x = 0; x < width; x++) {
            grid[y].push(fill)
        }
    }
    return grid
}

// Clears a grid by replacing all slots with an optional fill value (default is 0)
function clear_grid(grid, fill=0) {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {grid[y][x]=fill}
    }
}

// Randomises a given grid according to noise density
function randomise(grid, density) {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {
            rand = Math.random()
            switch(rand > density) {
                case true: grid[y][x] = 0; break;
                case false: grid[y][x] = 1; break;
                default: break;
            }
        }
    }
    return grid
}

// Draws the grid on a predefined canvas (See top of code)
function visualise(grid) {
    let h = c_width / grid.length, w = c_height / grid[0].length
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            let val = grid[y][x]
            switch(val == 1) {
                case true: ctx.fillStyle = '#F3F37B'; break;
                case false: ctx.fillStyle = '#212121'; break;
            }
            ctx.strokeStyle = 'FFFFFF'
            ctx.fillRect(x*w, y*h, w, h)
        }
    }
}

// Gets neighbours of a cell at a given [x,y] location in grid
function getn(grid, pos) {
    let adj = [[0,1],[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,-1],[-1,1]]
    let neighbours = [], sizes = [grid.length, grid[0].length]
    for (add of adj) {
        let npos = [...pos] // n(eighbour)pos
        let valid = true
        for (let i = 0; i < 2; i++) {
            npos[i] += add[i]
            if (npos[i] < 0 || npos[i] >= sizes[i]) {
                valid = false
            }
        }
        if (valid) {
            let [x,y] = npos
            neighbours.push(grid[y][x])
        }
    }
    return neighbours
}

// Performs one step of conway's game of life on a given grid then returns the updated version
function conway_step(grid) {
    let h = grid.length, w = grid[0].length
    const next = create_grid(w,h)
    console.log(w,h)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let neighbours = getn(grid, [x,y]), val = 0
            let alive = count(neighbours, 1), cell = grid[y][x]
            if (cell == 1) {
                if (alive <= 1 || alive >= 4) {val = 0}
                else {val = 1}
            } else if (cell == 0) {
                if (alive == 3) {val = 1}
            }
            next[y][x] = val
        }
    }
    return next
}

// Gets cursor position on cavas
function get_cpos(canvas, event) {
    if (!grid) {return}
    const rect = canvas.getBoundingClientRect()
    const canvas_x = event.clientX - rect.left
    const canvas_y = event.clientY - rect.top
    var w = c_width / grid[0].length
    var h = c_height / grid.length
    console.log(w,h)
    const x = Math.floor(canvas_x/w), y = Math.floor(canvas_y/h)
    grid[y][x] = 1 - grid[y][x] // stolen from stack overflow ngl
    visualise(grid)
}

// Connects get_cpos to a mouse click on the canvas
canvas.addEventListener("mousedown",(ev)=>{get_cpos(canvas, ev)})

// Commands
const binds = {
    "d" : ()=>{grid = conway_step(grid)},
    "a" : NaN,//step_back,
    "w" : clear_grid,
}

// Listens for key down events and executes the corresponding function if appropriate
document.onkeydown = function(ev) {
    canvas_focused = canvas_hovered
    let key = ev.key.toLowerCase()
    if (binds[key] && grid && canvas_focused) {
        binds[key](grid)
        visualise(grid)
    }
}

// List of all commands
const command_list = ['create','clear','run','stop']

// Commands
const commands = {
    ['create'] : {
        ['params'] : 1,
        ['func'] : ([size]) => {
            commands.stop.func()
            let sizes = size.trim().split(",")
            if (!sizes || sizes.length < 2) {return}
            length = Number(sizes[0]); height = Number(sizes[1])
            if (!(length && height)) {return}
            grid = create_grid(length, height)
            return 'created grid of size: ' + size
        }},
    ['clear'] : {
        ['params'] : 0,
        ['func'] : () => {
            commands.stop.func()
            clear_grid(grid)
            return 'cleared grid'
        }},
    ['run'] : {
        ['params'] : 0,
        ['func'] : () => {
            if (running) {return 'already running'}
            running = true
            simul_func = setInterval(()=>{grid = conway_step(grid); visualise(grid)}, 50)
            return ('started')
        }},
    ['stop'] : {
        ['params'] : 0,
        ['func'] : () => {
            if (!running) {return 'already stopped'}
            running = false
            clearInterval(simul_func)
            return 'stopped'
        },},
    ['cmds'] : {
        ['params'] : 0,
        ['func'] : () => {
            var str = ""
            for (cmd of command_list) {str+=cmd+" "}
            return str
        }
    }
}

// Command Handler
function handle_command(parsed) {
    var [command, ...args] = parsed, error = 'error: check command name / params'
    if (!commands[command]) {return 'command not found'}
    const func = commands[command].func, params = commands[command].params
    if (!(args.length >= params)) {return error}
    return func(args) || error
}

// Connects keyup event in textbox
cons_input.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() == "enter" && cons_input.value.length > 0) {
        const out = document.createElement("div"), inp = document.createElement("div")
        inp.setAttribute("class", "console-input-log")
        out.setAttribute("class", "console-output-log")
        inp.textContent = "> " + cons_input.value.trim()

        let parsed = cons_input.value.trim().split(' ')
        out.innerHTML = handle_command(parsed); visualise(grid)
        cons_input.value = ""
        history.scrollTop = history.scrollTopMax

        if (logs.length >= 8) {
            var last = logs[0]
            logs.splice(0,1)
            for (x of last) {history.removeChild(x)}
        }

        logs.push([inp, out])
        history.append(inp, out)
    }
})

// Initial Setup
var grid = create_grid(20,20)
visualise(grid)