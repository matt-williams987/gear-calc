"use strict"

var MM_PER_KM = 1000000
var MILES_PER_KM = 0.621371

var Main = {}


// TODO: Get rid of this ridiculous "state" thing and make it a config. State should be held by the
// various objects
Main.state = {
    pitch: 12.7,
    rollerDia: 7.93,
    rpm: 0.0,
    slave: { 
        t: 16, 
        x: 433.5, 
        y: -88
    },
    master: { 
        t: 46,
        x: 1300, 
        y: 745
    },
    height: 1100,
    width: 2200,
    rpmRate: 0.006,
    initAngle: 0.0,
    wheelDia: 676,
    unitConversion: 1,
    rider: {
        frontWheelX: -622.5, // Relative to master gear
        frameOffsetX: -505,
        frameOffsetY: -599,
        wheelOffset: {
            front: Math.random() * 360,
            rear: Math.random() * 360
        }
    }
}
Main.state.wheelCircum = Main.state.wheelDia * Math.PI
Main.state.rider.wheelDia = Main.state.wheelDia

Main.draw = {}
Main.rider = {}
Main.train = {}
Main.road = {}

//on ready
$(function () {
    $("#driver_slider").slider({
        max: 70,
        min: 28,
        value:  Main.state.master.t,
        slide: changeMaster
    })
    $("#slave_slider").slider({
        max: 42,
        min: 8,
        slide: changeSlave,
        value:  Main.state.slave.t
    })
    $("#rpm_slider").slider({
        max: 200,
        min: 0,
        slide: changeRPM,
        value:  Main.state.rpm
    })
    $("#speed_slider").slider({
        max: 150,
        min: 0,
        slide: changeSpeed
    })
    $("#unit_picker").slider({
        max: 1,
        min: 0,
        slide: changeUnits
    })
    $("#zoom_picker").slider({
        max: 1,
        min: 0,
        slide: changeZoom
    })
    init()
})

function changeMaster(event, ui) {
    Main.state.master.t = ui.value
    reset()
}

function changeSlave(event, ui) {
    Main.state.slave.t = ui.value
    reset()
}

function changeRPM(event, ui) {
    Main.state.rpm = ui.value
    Main.train.master.setSpeed(Main.state.rpm)
    updateSpeed(Main.state.rpm)
}

function changeSpeed(event, ui) {
    Main.state.rpm = ((ui.value * MM_PER_KM / 60) / Main.state.wheelCircum /
        (Main.train.master.t / Main.train.master.slave.t))
    Main.train.master.setSpeed(Main.state.rpm)
    updateSpeed(Main.state.rpm)
}

function changeUnits(event, ui) {
    if (ui.value === 0) {
        Main.state.unitConversion = 1.0
        $("#unitTracker").text("KPH")
    } else {
        Main.state.unitConversion = MILES_PER_KM
        $("#unitTracker").text("MPH")
    }
    updateSpeed(Main.state.rpm)
}

function changeZoom(event, ui) {
    console.log("zooming")
    if (ui.value == 0) {
        Main.draw.animate().viewbox(0, 0, Main.state.width, Main.state.height)
        $("#zoomTracker").text("OFF")
    } else {
        Main.draw.animate().viewbox(1000, 450, 1000 + 200, 450 + 100)
        $("#zoomTracker").text("ON")
    }
}

function updateSpeed(rpm) {
    var speed = rpm * (Main.train.master.t / Main.train.master.slave.t)
        * Main.state.wheelCircum / MM_PER_KM * 60
    $("#speed").text((speed * Main.state.unitConversion).toFixed(1))
    $("#speed_slider").slider("value", speed)
    $("#rpm").text(Main.state.rpm.toFixed(1))
    $("#rpm_slider").slider("value", Main.state.rpm)
}

function init() {
    $("#m-teeth").text(Main.state.master.t)
    $("#s-teeth").text(Main.state.slave.t)
    $("#rpm").text(Main.state.rpm.toFixed(1))
    // $("#speed").text((speed * Main.state.unitConversion).toFixed(1))
    Main.draw = SVG("sprockets").viewbox(0, 0,  Main.state.width,  Main.state.height)
        .style("display", "block")
    recreateDrawing()
    animate()
}

function reset() {
    $("#m-teeth").text( Main.state.master.t)
    $("#s-teeth").text( Main.state.slave.t)
    $("#rpm").text( Main.state.rpm)
    Main.state.initAngle = Main.train.master.angle
    Main.state.rider.wheelOffset.front = Main.rider.wheel.front.angle
    Main.state.rider.wheelOffset.rear = Main.rider.wheel.front.angle
    recreateDrawing()
    updateSpeed( Main.state.rpm)
}

function recreateDrawing() {
    Main.draw.clear()
    // TODO - No need to recreate rider and road completely each time, probably.
    Main.train = new Drive.DriveTrain(Main.draw, Main.state)
    Main.rider = new Rider.Rider(Main.draw, Main.train, Main.state.rider)
    Main.road = new Road.Road(Main.draw, Main.rider)
    sort()
}

function sort() {
    Main.rider.pedal.front.foot.svg.back()
    Main.rider.pedal.front.foot.leg.upper.back()
    Main.rider.pedal.front.foot.leg.lower.back()
    Main.rider.pedal.front.crank.back()
    Main.rider.frame.rearSvg.back()
    Main.train.group.back()
    Main.rider.frame.svg.back()
    Main.rider.wheel.front.svg.back()
    Main.rider.wheel.rear.svg.back()
    Main.rider.pedal.rear.crank.back()
    Main.rider.pedal.rear.foot.svg.back()
    Main.rider.pedal.rear.foot.leg.upper.back()
    Main.rider.pedal.rear.foot.leg.lower.back()
    Main.road.group.back()
}

function animate() {
    var previous = 0
    var dt = 0
    var step = function (timestamp) {
        dt = timestamp - previous
        previous = timestamp
        Main.train.step(dt)
        Main.rider.step(dt)
        Main.road.step()
        window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
}