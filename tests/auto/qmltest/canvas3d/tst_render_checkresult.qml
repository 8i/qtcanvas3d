/****************************************************************************
**
** Copyright (C) 2015 The Qt Company Ltd.
** Contact: http://www.qt.io/licensing/
**
** This file is part of the QtCanvas3D module of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:LGPL3$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see http://www.qt.io/terms-conditions. For further
** information use the contact form at http://www.qt.io/contact-us.
**
** GNU Lesser General Public License Usage
** Alternatively, this file may be used under the terms of the GNU Lesser
** General Public License version 3 as published by the Free Software
** Foundation and appearing in the file LICENSE.LGPLv3 included in the
** packaging of this file. Please review the following information to
** ensure the GNU Lesser General Public License version 3 requirements
** will be met: https://www.gnu.org/licenses/lgpl.html.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 2.0 or later as published by the Free
** Software Foundation and appearing in the file LICENSE.GPL included in
** the packaging of this file. Please review the following information to
** ensure the GNU General Public License version 2.0 requirements will be
** met: http://www.gnu.org/licenses/gpl-2.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

import QtQuick 2.2
import QtCanvas3D 1.0
import QtTest 1.0

import "tst_render_checkresult.js" as Content

Item {
    id: top
    height: 300
    width: 300

    property bool checkResult: false
    property int xpos: 0
    property int ypos: 0
    property var pixels
    property int red: -1
    property int green: -1
    property int blue: -1
    property int alpha: -1
    property bool renderOk: false

    Canvas3D {
        id: render_check_result
        property bool textureLoaded: false
        anchors.fill: parent
        onInitializeGL: Content.initializeGL(this)
        onPaintGL: {
            if (checkResult) {
                pixels = Content.paintGL(xpos, ypos)
                red = pixels[0]
                green = pixels[1]
                blue = pixels[2]
                alpha = pixels[3]
                delete pixels
            } else {
                Content.paintGL()
                red = -1
                green = -1
                blue = -1
                alpha = -1
            }
            renderOk = true
        }
    }

    TestCase {
        name: "Canvas3D_render_checkresult"
        when: windowShown

        function test_render_1_checkresult() {
            // Check color in the center of the blue square
            xpos = 150
            ypos = 150
            checkResult = true
            renderOk = false
            waitForRendering(render_check_result)
            tryCompare(top, "renderOk", true)
            tryCompare(top, "red", 0x00)
            tryCompare(top, "green", 0x00)
            tryCompare(top, "blue", 0xff)
            tryCompare(top, "alpha", 0xff)
            checkResult = false

            waitForRendering(render_check_result)

            // Check color in the corner of the screen, which is cleared with red
            xpos = 0
            ypos = 0
            checkResult = true
            renderOk = false
            waitForRendering(render_check_result)
            tryCompare(top, "renderOk", true)
            tryCompare(top, "red", 0xff)
            tryCompare(top, "green", 0x00)
            tryCompare(top, "blue", 0x00)
            tryCompare(top, "alpha", 0xff)
            checkResult = false

            waitForRendering(render_check_result)
        }

        function test_render_2_checkresult() {
            // Set a solid color texture, and check that the color matches in the center
            waitForRendering(render_check_result)
            Content.setTexture(render_check_result, "tst_render_checkresult.png")
            xpos = 150
            ypos = 150
            checkResult = true
            renderOk = false
            waitForRendering(render_check_result)
            tryCompare(top, "renderOk", true)
            tryCompare(render_check_result, "textureLoaded", true, 10000)
            tryCompare(top, "red", 0xff)
            tryCompare(top, "green", 0x99)
            tryCompare(top, "blue", 0x22)
            tryCompare(top, "alpha", 0xff)
            checkResult = false
            Content.setTexture()

            waitForRendering(render_check_result)
        }

        function test_render_3_checkresult() {
            // Set a partially transparent color, and check it
            waitForRendering(render_check_result)
            Content.setColor(0x22, 0x99, 0xff, 0x80)
            xpos = 150
            ypos = 150
            checkResult = true
            renderOk = false
            waitForRendering(render_check_result)
            tryCompare(top, "renderOk", true)
            tryCompare(top, "red", 0x22)
            tryCompare(top, "green", 0x99)
            tryCompare(top, "blue", 0xff)
            tryCompare(top, "alpha", 0x80)
            checkResult = false

            waitForRendering(render_check_result)
        }
    }
}
