'use strict';
let sceneTexture;

function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        return;
    }

    const ext = gl.getExtension('WEBGL_depth_texture');
    if (!ext) {
        return alert('need WEBGL_depth_texture');  // eslint-disable-line
    }

    // setup GLSL programs
    const textureProgramInfo = webglUtils.createProgramInfo(gl, ['3d-vertex-shader', '3d-fragment-shader']);
    const colorProgramInfo = webglUtils.createProgramInfo(gl, ['color-vertex-shader', 'color-fragment-shader']);

    sceneTexture  = initTexture('texture.jpg');
    function initTexture(url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            width, height, border, srcFormat, srcType,
            pixel);

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                srcFormat, srcType, image);
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // Размер не соответствует степени 2.
                // Отключаем MIP'ы и устанавливаем натяжение по краям
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = url;
        return texture;
    }


    const sphereBufferInfo = primitives.createSphereBufferInfo(
        gl,
        1,  // radius
        32, // subdivisions around
        24, // subdivisions down
    );
    const planeBufferInfo = primitives.createTruncatedConeBufferInfo(
        gl,
        1,
        1,
        1,
        100,
        2 // subdivisions down
    );
    const cubeBufferInfo = primitives.createCubeBufferInfo(
        gl,
        2,  // size
    );
    const coneBufferInfo = primitives.createTruncatedConeBufferInfo(
        gl,
        1,
        0,
        1,
        100,
        2 // subdivisions down
    );


    const cubeLinesBufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
        position: [
            -1, -1, -1,
            1, -1, -1,
            -1,  1, -1,
            1,  1, -1,
            -1, -1,  1,
            1, -1,  1,
            -1,  1,  1,
            1,  1,  1,
        ],
        indices: [
            0, 1,
            1, 3,
            3, 2,
            2, 0,

            4, 5,
            5, 7,
            7, 6,
            6, 4,

            0, 4,
            1, 5,
            3, 7,
            2, 6,
        ],
    });

    // make a 8x8 checkerboard texture
    const checkerboardTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,                // mip level
        gl.LUMINANCE,     // internal format
        8,                // width
        8,                // height
        0,                // border
        gl.LUMINANCE,     // format
        gl.UNSIGNED_BYTE, // type
        new Uint8Array([  // data
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ]));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const depthTexture = gl.createTexture();
    const depthTextureSize = 512;
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,      // target
        0,                  // mip level
        gl.DEPTH_COMPONENT, // internal format
        depthTextureSize,   // width
        depthTextureSize,   // height
        0,                  // border
        gl.DEPTH_COMPONENT, // format
        gl.UNSIGNED_INT,    // type
        null);              // data
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,       // target
        gl.DEPTH_ATTACHMENT,  // attachment point
        gl.TEXTURE_2D,        // texture target
        depthTexture,         // texture
        0);                   // mip level


    const settings = {
        cameraX: 6,
        cameraY: 5,
        posX: 3,
        posY: 8,
        posZ: 5,
        targetX: 2.5,
        targetY: 0,
        targetZ: 3.5,
        projWidth: 1,
        projHeight: 1,
        perspective: true,
        fieldOfView: 120,
        bias: -0.006,
    };
    webglLessonsUI.setupUI(document.querySelector('#ui'), settings, [
        { type: 'slider',   key: 'cameraX',    min: -10, max: 100, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'cameraY',    min:   1, max: 100, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'posX',       min: -10, max: 10, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'posY',       min:   1, max: 20, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'posZ',       min:   1, max: 20, change: render, precision: 2, step: 0.001, },
        // { type: 'slider',   key: 'targetX',    min: -10, max: 10, change: render, precision: 2, step: 0.001, },
        // { type: 'slider',   key: 'targetY',    min:   0, max: 20, change: render, precision: 2, step: 0.001, },
        // { type: 'slider',   key: 'targetZ',    min: -10, max: 20, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'projWidth',  min:   0, max:  2, change: render, precision: 2, step: 0.001, },
        { type: 'slider',   key: 'projHeight', min:   0, max:  2, change: render, precision: 2, step: 0.001, },
        // { type: 'checkbox', key: 'perspective', change: render, },
        // { type: 'slider',   key: 'fieldOfView', min:  1, max: 179, change: render, },
        // { type: 'slider',   key: 'bias',       min:  -0.01, max: 0.00001, change: render, precision: 4, step: 0.0001, },
    ]);

    const fieldOfViewRadians = degToRad(60);

    // Uniforms for each object.
    const planeUniforms = {
        u_colorMult: [1, 1, 1, 1],  // lightblue
        u_color: [1, 0, 0, 1],
        u_texture: sceneTexture,
        u_world: m4.scale(m4.translation(0, 1, 0), 4, 0.7, 4),
    };


    function drawScene(
        projectionMatrix,
        cameraMatrix,
        textureMatrix,
        lightWorldMatrix,
        programInfo) {
        // Make a view matrix from the camera matrix.
        const viewMatrix = m4.inverse(cameraMatrix);

        gl.useProgram(programInfo.program);

        // set uniforms that are the same for both the sphere and plane
        // note: any values with no corresponding uniform in the shader
        // are ignored.
        webglUtils.setUniforms(programInfo, {
            u_view: viewMatrix,
            u_projection: projectionMatrix,
            u_bias: settings.bias,
            u_textureMatrix: textureMatrix,
            u_projectedTexture: depthTexture,
            u_shininess: 150,
            u_innerLimit: Math.cos(degToRad(settings.fieldOfView / 2 - 10)),
            u_outerLimit: Math.cos(degToRad(settings.fieldOfView / 2)),
            u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
            u_lightWorldPosition: [settings.posX, settings.posY, settings.posZ],
            u_viewWorldPosition: cameraMatrix.slice(12, 15),
        });

        // ------ Draw the sphere --------

        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);

        // Set the uniforms unique to the sphere
        webglUtils.setUniforms(programInfo,
            {
                u_colorMult: [0.043, 0.42, 0.35, 1],  // pink
                u_color: [0, 0, 1, 1],
                u_texture: checkerboardTexture,
                u_world: m4.scale(m4.translation(0, 2.3, 0), 1, 1, 1),});

        // calls gl.drawArrays or gl.drawElements
        webglUtils.drawBufferInfo(gl, sphereBufferInfo);


        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);


        // ------ Draw the plane --------

        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(gl, programInfo, planeBufferInfo);

        // Set the uniforms unique to the cube
        webglUtils.setUniforms(programInfo, planeUniforms);

        // calls gl.drawArrays or gl.drawElements
        webglUtils.drawBufferInfo(gl, planeBufferInfo);

        // ------ Draw the cone --------
        let radius = 3.5;
        let smallRadius = 0.3;
        let n = 5;
        let centerX;
        let centerY;
        let centerZ;
        for (let i = 0; i < 2*Math.PI; i += 0.06){
            centerX = (radius + smallRadius * Math.cos(n * i)) * Math.cos(i + 2);
            centerY = (smallRadius * Math.sin(n * i)) ;
            centerZ = (radius + smallRadius * Math.cos(n * i)) * Math.sin(i + 2);

            webglUtils.setBuffersAndAttributes(gl, programInfo, coneBufferInfo);
            // Set the uniforms unique to the cube
            webglUtils.setUniforms(programInfo, {
                u_colorMult: [44 / 255, 185 / 255, 1, 1],  // lightgreen
                u_color: [0, 0, 1, 1],
                u_texture: checkerboardTexture,
                u_world: m4.scale(m4.axisRotate(m4.translation(centerX, centerY+1.85, centerZ), [1, 1, 0],   i), 0.1, 0.4, 0.1),});
            // calls gl.drawArrays or gl.drawElements
            webglUtils.drawBufferInfo(gl, coneBufferInfo);
        }

        // ------ Draw the cube --------
        // centerY = 3;

        for ( let i = 0; i < 2 * Math.PI; i += 0.07) {
            centerX = (radius + smallRadius * Math.cos(n * i)) * Math.cos(i);
            centerY = (smallRadius * Math.sin(n * i)) ;
            centerZ = (radius + smallRadius * Math.cos(n * i)) * Math.sin(i);

            webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);

            // Set the uniforms unique to the cube
            webglUtils.setUniforms(programInfo, {
                u_colorMult: [204 / 255, 0, 102 / 255, 1],  // lightgreen
                u_color: [0, 0, 1, 1],
                u_texture: checkerboardTexture,
                u_world: m4.axisRotate((m4.scale(m4.translation(centerX, centerY+1.85, centerZ), 0.1, 0.1, 0.1)), [1, 0, 1], i),
            });
            // calls gl.drawArrays or gl.drawElements
            webglUtils.drawBufferInfo(gl, cubeBufferInfo);
        }



        // ------ Draw the smallSphere --------
        // Setup all the needed attributes.
        centerY = 2;
        for (let i = 0; i < 2*Math.PI; i += 0.085){
            centerX = (radius + smallRadius * Math.cos(n * i)) * Math.cos(i+1);
            centerY = (smallRadius * Math.sin(n * i)) ;
            centerZ = (radius + smallRadius * Math.cos(n * i)) * Math.sin(i+1);
            webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);
            // Set the uniforms unique to the cube
            webglUtils.setUniforms(programInfo, {
                u_colorMult: [1, 1, 0, 1],  // lightgreen
                u_color: [0, 0, 1, 1],
                u_texture: checkerboardTexture,
                u_world: m4.scale(m4.translation(centerX, centerY+1.9, centerZ), 0.15, 0.15, 0.15),});
            // calls gl.drawArrays or gl.drawElements
            webglUtils.drawBufferInfo(gl, sphereBufferInfo);
        }


    }

    // Draw the scene.
    function render() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // first draw from the POV of the light
        const lightWorldMatrix = m4.lookAt(
            [settings.posX, settings.posY, settings.posZ],          // position
            [3, 0, 3], // target
            [0, 1, 0],                                              // up
        );
        const lightProjectionMatrix = settings.perspective
            ? m4.perspective(
                degToRad(settings.fieldOfView),
                settings.projWidth / settings.projHeight,
                0.5,  // near
                10)   // far
            : m4.orthographic(
                -settings.projWidth / 2,   // left
                settings.projWidth / 2,   // right
                -settings.projHeight / 2,  // bottom
                settings.projHeight / 2,  // top
                0.5,                      // near
                10);                      // far

        // draw to the depth texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
        gl.viewport(0, 0, depthTextureSize, depthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawScene(
            lightProjectionMatrix,
            lightWorldMatrix,
            m4.identity(),
            lightWorldMatrix,
            colorProgramInfo);

        // now draw scene to the canvas projecting the depth texture into the scene
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0.5, 1, 0.5);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let textureMatrix = m4.identity();
        textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
        // use the inverse of this world matrix to make
        // a matrix that will transform other positions
        // to be relative this this world space.
        textureMatrix = m4.multiply(
            textureMatrix,
            m4.inverse(lightWorldMatrix));

        // Compute the projection matrix
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix =
            m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // Compute the camera's matrix using look at.
        const cameraPosition = [settings.cameraX, settings.cameraY, 7];
        const target = [0, 0, 0];
        const up = [0, 1, 0];
        const cameraMatrix = m4.lookAt(cameraPosition, target, up);

        drawScene(
            projectionMatrix,
            cameraMatrix,
            textureMatrix,
            lightWorldMatrix,
            textureProgramInfo);

        // ------ Draw the frustum ------
        // {
        //     const viewMatrix = m4.inverse(cameraMatrix);
        //
        //     gl.useProgram(colorProgramInfo.program);
        //
        //     // Setup all the needed attributes.
        //     webglUtils.setBuffersAndAttributes(gl, colorProgramInfo, cubeLinesBufferInfo);
        //
        //     // scale the cube in Z so it's really long
        //     // to represent the texture is being projected to
        //     // infinity
        //     const mat = m4.multiply(
        //         lightWorldMatrix, m4.inverse(lightProjectionMatrix));
        //
        //     // Set the uniforms we just computed
        //     webglUtils.setUniforms(colorProgramInfo, {
        //         u_color: [1, 1, 1, 1],
        //         u_view: viewMatrix,
        //         u_projection: projectionMatrix,
        //         u_world: mat,
        //     });
        //
        //     // calls gl.drawArrays or gl.drawElements
        //     webglUtils.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
        // }
    }
    render();
}

main();
