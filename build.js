// I should have made this sensible. This demands so much typing every time something is added.

const fs = require('fs')
const format = require("string-template")
const shell = require('shelljs')
const UglifyJS = require("uglify-js")

shell.rm("-rf", "dist/")
createDist()
console.log("Build completed at " + Date())

if (process.argv[2] === "distribute") {
    compressScripts()
    console.log("And js files compressed")
}

function createDist() {
    fs.mkdirSync("dist")
    fs.mkdirSync("dist/lib")

    // Paste SVG file contents in to svgelements.js:
    var svgFiles = {
        foot: "resources/foot.svg",
        footBack: "resources/footBack.svg",
        frame: "resources/frame.svg",
        upper: "resources/upper.svg",
        lower: "resources/lower.svg",
        lowerBack: "resources/lowerBack.svg",
        upperBack: "resources/upperBack.svg",
        wheel: "resources/wheel.svg",
        frameRear: "resources/frameRear.svg",
        crank: "resources/crank.svg",
        backCrank : "resources/backCrank.svg"
    }
    svgElements(svgFiles)

    // Move everything to dist directory
    var toCopy = [
        "src/gear.js",
        "src/index.html",
        "src/main.js",
        "src/rider.js",
        "src/road.js",
        "src/styles.css",
        "resources/LCD14.otf",
        "resources/title.svg",
        "resources/favicon-pkg/dist/*"
    ]
    shell.cp(toCopy, "dist/")
    shell.cp("node_modules/svg.js/dist/svg.min.js", "dist/lib/svg.min.js")
    shell.cp("lib/*", "dist/lib/")
}

function svgElements(changes) {
    var file = fs.readFileSync("src/svgelements.js.template", "utf8")
    var replacements = {}
    for (var key in changes) {
        let svg = fs.readFileSync(changes[key], "utf8")
        svg = svg.slice(svg.indexOf("<g"), svg.indexOf("</svg>")).replace(/\r?\n|\r/g, " ")
        replacements[key] = svg
    }
    file = format(file, replacements)
    fs.writeFileSync("dist/svgelements.js", file)
}

function compressScripts() {
    var toMin = ["gear.js", "main.js", "rider.js", "road.js"]
    for (var i = 0; i < toMin.length; i++) {
        let s = fs.readFileSync("dist/" + toMin[i], "utf8")
        let c = UglifyJS.minify(s)
        if (c.error !== undefined) {
            throw c.error
        }
        fs.writeFileSync("dist/" + toMin[i], c.code)
    }
}