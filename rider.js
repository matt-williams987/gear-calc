"use strict"

var Rider = {}

Rider.Rider = function(draw, drive, c) {
    this.draw = draw
    this.drive = drive
    this.gear = drive.master
    this.crankLength = 165
    this.pedalLength = 70
    this.sgroup = this.draw.group()
    this.groups = {
        crank: this.sgroup.group(),
        pedal: this.sgroup.group(),
        frame: this.draw.group(),
    }
    this.groups.crank.line(
        this.gear.x, this.gear.y, this.gear.x + this.crankLength + 8, this.gear.y)
        .stroke({ color: "#eee", width: 20 })
    this.groups.pedal.line(
        this.gear.x + this.crankLength - this.pedalLength / 2, this.gear.y, 
        this.gear.x + this.crankLength + this.pedalLength / 2, this.gear.y)
        .stroke({ color: "#000", width: 12 })
    this.legs = new Rider.Legs(this)
    this.wheel = new Rider.Wheel(this, this.gear.x + c.frontWheelX, c.wheelOffset)
    this.groups.frame.svg(SVGE.frame).move(this.gear.x + c.frameOffsetX, this.gear.y + c.frameOffsetY)
    this.pedalPos = this.getPedalPos()
}

Rider.Rider.prototype.getPedalPos = function() {
    var t = Drive.toRad(this.gear.angle)
    var x = Math.cos(t) * this.crankLength + this.gear.x
    var y = Math.sin(t) * this.crankLength + this.gear.y
    return {x: x, y: y}
}

Rider.Rider.prototype.step = function (dt) {
    this.groups.crank.rotate(this.gear.angle, this.gear.x, this.gear.y)
    this.groups.pedal.move(
        Math.cos(Drive.toRad(this.gear.angle)) * this.crankLength - this.crankLength, 
        Math.sin(Drive.toRad(this.gear.angle)) * this.crankLength)
    this.pedalPos = this.getPedalPos()
    this.legs.step()
    this.wheel.step(dt)
}

Rider.Legs = function(rider) {
    this.rider = rider
    this.sgroup = this.rider.sgroup.group()
    this.groups = {
        lower: this.sgroup.group(),
        upper: this.sgroup.group()
    }
    this.geo = {
        upper: {
            x: this.rider.gear.x + 60,
            y: this.rider.gear.y - 650,
            length: 435
        },
        lower: {
            length: 435
        }
    }
    // Have to have a specific property to refer just to this line, because rotating groups
    // about a point does not work as I expected.
    this.lower = this.groups.lower.line(this.geo.upper.x, this.geo.upper.y,
        this.geo.upper.x + this.geo.lower.length, this.geo.upper.y)
        .stroke({ color: "#000", width: 80 })
    this.groups.upper.line(this.geo.upper.x, this.geo.upper.y,
        this.geo.upper.x + this.geo.upper.length, this.geo.upper.y)
        .stroke({ color: "#6ff", width: 80 })
}

Rider.Legs.prototype.step = function() {
    var angle = this.pedalAngle() - Math.PI
    var ha = this.scaleneAngle(this.geo.lower.length, this.geo.upper.length, this.pedalDistance())
    var ka = this.scaleneAngle(this.pedalDistance(), this.geo.lower.length, this.geo.upper.length)
    var x = this.geo.upper.length * Math.cos(ha + angle)
    var y = this.geo.upper.length * Math.sin(ha + angle)
    this.groups.lower.move(x, y)
    this.groups.upper.rotate(Drive.toDeg(ha + angle), this.geo.upper.x, this.geo.upper.y)
    this.lower.rotate(Drive.toDeg(angle + ha + ka - Math.PI), this.geo.upper.x, this.geo.upper.y)

}

// Gets the distance between the hip joint and the pedal
Rider.Legs.prototype.pedalDistance = function () {
    var xDist = this.geo.upper.x - this.rider.pedalPos.x
    var yDist = this.geo.upper.y - this.rider.pedalPos.y
    return Math.hypot(xDist, yDist)
}

// Gets the angle between the hip joint and the pedal 
Rider.Legs.prototype.pedalAngle = function () {
    var xDist = this.geo.upper.x - this.rider.pedalPos.x
    var yDist = this.geo.upper.y - this.rider.pedalPos.y
    return Math.atan2(yDist, xDist)
}

Rider.Legs.prototype.scaleneAngle = function (a, b, c) {
    return Math.acos(((b * b) + (c * c) - (a * a)) / (2 * b * c))
}

Rider.Wheel = function(rider, frontX, offsets) {
    this.angle = {
        front: offsets.front,
        rear: offsets.rear
    }
    this.rider = rider
    this.group = this.rider.draw.group()
    this.group2 = this.rider.draw.group()
    this.group.svg(SVGE.wheel).center(this.rider.gear.slave.x, this.rider.gear.slave.y)
    this.group2.svg(SVGE.wheel).center(frontX, this.rider.gear.slave.y)
    this.step(0)
}

Rider.Wheel.prototype.step = function(dt) {
    var movement = dt * this.rider.drive.master.speed * 
        (this.rider.drive.master.t / this.rider.drive.master.slave.t)
    this.angle.front += movement
    this.angle.rear += movement
    this.group.rotate(this.angle.rear)
    this.group2.rotate(this.angle.front)
}
