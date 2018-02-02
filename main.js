"use strict"

var config = {
    pitch: 12.7,
    rollerDia: 7.93,
    speed: 4,
    slave: { t: 15, x: 922, y: 512 },
    master: { t: 43, x: 502, y: 595 }
}

var height = 800
var width = 1000
var draw, train

//on ready
$(function () {
    $("#driver_slider").slider({
        max: 60,
        min: 12,
        value: config.master.t,
        slide: changeMaster
    })
    $("#slave_slider").slider({
        max: 48,
        min: 8,
        slide: changeSlave,
        value: config.slave.t
    })
    $("#speed_slider").slider({
        max: 20,
        min: 0,
        slide: changeSpeed,
        value: config.speed
    })
    $("#rpm_slider").slider({
        max: 200,
        min: 0,
    })
    $("#crank_length_slider").slider({
        max: 10,
        min: 0,
    })
    init()
})

function init() {
    draw = SVG("sprockets").viewbox(0, 0, width, height)
    reset()
    animate()
}

function reset() {
    $("#m-teeth").text(config.master.t)
    $("#s-teeth").text(config.slave.t)
    $("#speed").text(config.speed)
    draw.clear()
    var frame = draw.group()
    train = new Drive.DriveTrain(draw, config)
    frame.svg(SVGE.frame)
    frame.back()
    train.group.front()
}

function animate() {
    var previous = 0
    var dt = 0
    var step = function (timestamp) {
        dt = timestamp - previous
        previous = timestamp
        train.step(dt)
        window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
}

function createGears(config) {
    return new Drive.DriveTrain(draw, config)
}

function changeMaster(event, ui) {
    config.master.t = ui.value
    reset()
}

function changeSlave(event, ui) {
    config.slave.t = ui.value
    reset()
}

function changeSpeed(event, ui) {
    config.speed = ui.value
    train.master.setSpeed(ui.value)
}