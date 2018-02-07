"use strict"

var Main = {}

Main.config = {
    pitch: 12.7,
    rollerDia: 7.93,
    speed: 0.36,
    slave: { 
        t: 18, 
        x: 1232, 
        y: 664
    },
    master: { 
        t: 44,
        x: 802, 
        y: 745
    },
    height: 1100,
    width: 1800,
    rpmRate: 0.006,
    initAngle: 0.0
}

Main.draw = {}
Main.rider = {}
Main.train = {}

//on ready
$(function () {
    $("#driver_slider").slider({
        max: 60,
        min: 12,
        value: Main.config.master.t,
        slide: changeMaster
    })
    $("#slave_slider").slider({
        max: 48,
        min: 8,
        slide: changeSlave,
        value: Main.config.slave.t
    })
    $("#rpm_slider").slider({
        max: 270,
        min: 0,
        slide: changeRPM,
        value: Main.config.speed / Main.config.rpmRate
    })
    $("#speed_slider").slider({
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
    Main.draw = SVG("sprockets").viewbox(0, 0, Main.config.width, Main.config.height)
    reset()
    animate()
}

function reset() {
    $("#m-teeth").text(Main.config.master.t)
    $("#s-teeth").text(Main.config.slave.t)
    $("#rpm").text(Main.config.speed / Main.config.rpmRate)
    if (Main.train.master !== undefined) {
        Main.config.initAngle = Main.train.master.angle
    }
    Main.draw.clear()
    Main.train = new Drive.DriveTrain(Main.draw, Main.config)
    Main.rider = new Rider.Rider(Main.draw, Main.train)
    sort()
}

function sort() {
    Main.rider.legs.sgroup.back()
    Main.rider.groups.pedal.back()
    Main.rider.groups.crank.back()  
    Main.train.group.back()
    Main.rider.groups.frame.back()
}

function animate() {
    var previous = 0
    var dt = 0
    var step = function (timestamp) {
        dt = timestamp - previous
        previous = timestamp
        Main.train.step(dt)
        Main.rider.step()
        window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
}

function changeMaster(event, ui) {
    Main.config.master.t = ui.value
    reset()
}

function changeSlave(event, ui) {
    Main.config.slave.t = ui.value
    reset()
}

function changeRPM(event, ui) {
    Main.config.speed = ui.value * Main.config.rpmRate
    Main.train.master.setSpeed(ui.value * Main.config.rpmRate)
    $("#rpm").text(ui.value)
}

function changeSpeed(event, ui) {
    // First calculate the required RPM for a given speed
    // Then call changeRPM
    // changeRPM should be responsible for updating the speed display
}