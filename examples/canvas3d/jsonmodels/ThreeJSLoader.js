function GLModel() {
    this.vertices = [];
    this.normals = [];
    this.texCoords = [];
    this.indices = [];
}

function Geometry() {
    this.vertices = [];
    this.faceVertexUvs = [];
    this.faces = [];
}

function Face3( a, b, c, normal, color, materialIndex ) {

    this.a = a;
    this.b = b;
    this.c = c;

    this.normal = normal instanceof Vector3 ? normal : new Vector3();
    this.vertexNormals = normal instanceof Array ? normal : [ ];

    this.color = color instanceof Array ? color :  [ ];
    this.vertexColors = color instanceof Array ? color : [];

    this.vertexTangents = [];

    this.materialIndex = materialIndex !== undefined ? materialIndex : 0;

    this.centroid = new Vector3()
};

function Vector2( x, y ) {
    this.x = x || 0;
    this.y = y || 0;
};

function Vector3( x, y, z ) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

Vector3.prototype = {

    constructor: Vector3,

    set: function ( x, y, z ) {

        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    },

    copy: function ( v ) {

        this.x = v.x;
        this.y = v.y;
        this.z = v.z;

        return this;

    }
};

Face3.prototype = {

    constructor: Face3,

    clone: function () {

        var face = new Face3( this.a, this.b, this.c );

        face.normal.copy( this.normal );
        face.color.copy( this.color );
        face.centroid.copy( this.centroid );

        face.materialIndex = this.materialIndex;

        var i, il;
        for ( i = 0, il = this.vertexNormals.length; i < il; i ++ ) face.vertexNormals[ i ] = this.vertexNormals[ i ].clone();
        for ( i = 0, il = this.vertexColors.length; i < il; i ++ ) face.vertexColors[ i ] = this.vertexColors[ i ].clone();
        for ( i = 0, il = this.vertexTangents.length; i < il; i ++ ) face.vertexTangents[ i ] = this.vertexTangents[ i ].clone();

        return face;
    }
};

function parseJSON3DModel( json, texturePath )
{
    var formatVersion = json.metadata.formatVersion;

    if (formatVersion < 4.0 ) {
        var i, j;
        var geometry = new Geometry();
        var scale = ( json.scale !== undefined ) ? 1.0 / json.scale : 1.0;
        parseModel( json, geometry, scale );

        // Translate to model we can use from GL
        var glModel = new GLModel();

        for (i = 0; i < geometry.vertices.length; i++) {
            glModel.vertices.push(geometry.vertices[i].x);
            glModel.vertices.push(geometry.vertices[i].y);
            glModel.vertices.push(geometry.vertices[i].z);
        }

        glModel.texCoords[0] = [];
        for (var faceIdx = 0; faceIdx < geometry.faces.length; faceIdx++) {
            var face = geometry.faces[faceIdx];
            // Array indices
            glModel.indices.push(face.a);
            glModel.indices.push(face.b);
            glModel.indices.push(face.c);

            // Materials
            // face.materialIndex

            // Only parse first layer of UVs for this face
            for(var uvLayer = 0; uvLayer < geometry.faceVertexUvs.length; uvLayer++) {
                var faceUVs = geometry.faceVertexUvs[uvLayer][faceIdx];
                var idxUVA = face.a * 2;
                var idxUVB = face.b * 2;
                var idxUVC = face.c * 2;

                glModel.texCoords[uvLayer][idxUVA++] = faceUVs[0].x;
                glModel.texCoords[uvLayer][idxUVA  ] = faceUVs[0].y;
                glModel.texCoords[uvLayer][idxUVB++] = faceUVs[1].x;
                glModel.texCoords[uvLayer][idxUVB  ] = faceUVs[1].y;
                glModel.texCoords[uvLayer][idxUVC++] = faceUVs[2].x;
                glModel.texCoords[uvLayer][idxUVC  ] = faceUVs[2].y;
            }

            // Normal
            if (face.vertexNormals !== undefined) {
                // Per vertex normals
                var idxA = face.a * 3;
                var idxB = face.b * 3;
                var idxC = face.c * 3;
                var vrtNormals = face.vertexNormals;

                glModel.normals[idxA++] = vrtNormals[0].x;
                glModel.normals[idxA++] = vrtNormals[0].y;
                glModel.normals[idxA  ] = vrtNormals[0].z;

                glModel.normals[idxB++] = vrtNormals[1].x;
                glModel.normals[idxB++] = vrtNormals[1].y;
                glModel.normals[idxB  ] = vrtNormals[1].z;

                glModel.normals[idxC++] = vrtNormals[2].x;
                glModel.normals[idxC++] = vrtNormals[2].y;
                glModel.normals[idxC  ] = vrtNormals[2].z;
            } else if (face.normal !== undefined) {
                // Per face normal
                glModel.normals[idxA++] = face.normal.x;
                glModel.normals[idxA++] = face.normal.y;
                glModel.normals[idxA  ] = face.normal.z;

                glModel.normals[idxB++] = face.normal.x;
                glModel.normals[idxB++] = face.normal.y;
                glModel.normals[idxB  ] = face.normal.z;

                glModel.normals[idxC++] = face.normal.x;
                glModel.normals[idxC++] = face.normal.y;
                glModel.normals[idxC  ] = face.normal.z;
            }
        }
    }

    return glModel;
};

function parseModel( json, geometry, scale ) {

    function isBitSet( value, position )
    {
        return value & ( 1 << position );
    }

    var i, j, fi,

            offset, zLength,

            colorIndex, normalIndex, uvIndex, materialIndex,

            type,
            isQuad,
            hasMaterial,
            hasFaceVertexUv,
            hasFaceNormal, hasFaceVertexNormal,
            hasFaceColor, hasFaceVertexColor,

            vertex, face, faceA, faceB, color, hex, normal,

            uvLayer, uv, u, v,

            faces = json.faces,
            vertices = json.vertices,
            normals = json.normals,
            colors = json.colors,

            nUvLayers = 0;

    if ( json.uvs !== undefined ) {
        // disregard empty arrays
        for ( i = 0; i < json.uvs.length; i++ ) {
            if ( json.uvs[ i ].length > 0 ) nUvLayers ++;
        }

        for ( i = 0; i < nUvLayers; i++ ) {
            geometry.faceVertexUvs[ i ] = [];
        }
    }

    offset = 0;
    zLength = vertices.length;

    while ( offset < zLength ) {
        vertex = new Vector3();

        vertex.x = vertices[ offset ++ ] * scale;
        vertex.y = vertices[ offset ++ ] * scale;
        vertex.z = vertices[ offset ++ ] * scale;

        geometry.vertices.push( vertex );
    }

    offset = 0;
    zLength = faces.length;

    while ( offset < zLength ) {
        type = faces[ offset ++ ];

        isQuad              = isBitSet( type, 0 );
        hasMaterial         = isBitSet( type, 1 );
        hasFaceVertexUv     = isBitSet( type, 3 );
        hasFaceNormal       = isBitSet( type, 4 );
        hasFaceVertexNormal = isBitSet( type, 5 );
        hasFaceColor	    = isBitSet( type, 6 );
        hasFaceVertexColor  = isBitSet( type, 7 );

        // console.log("type", type, "bits", isQuad, hasMaterial, hasFaceVertexUv, hasFaceNormal, hasFaceVertexNormal, hasFaceColor, hasFaceVertexColor);

        if ( isQuad ) {
            faceA = new Face3();
            faceA.a = faces[ offset ];
            faceA.b = faces[ offset + 1 ];
            faceA.c = faces[ offset + 3 ];

            faceB = new Face3();
            faceB.a = faces[ offset + 1 ];
            faceB.b = faces[ offset + 2 ];
            faceB.c = faces[ offset + 3 ];

            offset += 4;

            if ( hasMaterial ) {
                materialIndex = faces[ offset ++ ];
                faceA.materialIndex = materialIndex;
                faceB.materialIndex = materialIndex;
            }

            // to get face <=> uv index correspondence
            fi = geometry.faces.length;

            if ( hasFaceVertexUv ) {
                for ( i = 0; i < nUvLayers; i++ ) {
                    uvLayer = json.uvs[ i ];
                    geometry.faceVertexUvs[ i ][ fi ] = [];
                    geometry.faceVertexUvs[ i ][ fi + 1 ] = []

                    for ( j = 0; j < 4; j ++ ) {
                        uvIndex = faces[ offset ++ ];

                        u = uvLayer[ uvIndex * 2 ];
                        v = uvLayer[ uvIndex * 2 + 1 ];

                        uv = new Vector2( u, v );

                        if ( j !== 2 ) geometry.faceVertexUvs[ i ][ fi ].push( uv );
                        if ( j !== 0 ) geometry.faceVertexUvs[ i ][ fi + 1 ].push( uv );
                    }
                }
            }

            if ( hasFaceNormal ) {
                normalIndex = faces[ offset ++ ] * 3;
                faceA.normal.set(
                            normals[ normalIndex ++ ],
                            normals[ normalIndex ++ ],
                            normals[ normalIndex ]
                            );
                faceB.normal.copy( faceA.normal );
            }

            if ( hasFaceVertexNormal ) {
                for ( i = 0; i < 4; i++ ) {
                    normalIndex = faces[ offset ++ ] * 3;
                    normal = new Vector3(
                                normals[ normalIndex ++ ],
                                normals[ normalIndex ++ ],
                                normals[ normalIndex ]
                                );

                    if ( i !== 2 ) faceA.vertexNormals.push( normal );
                    if ( i !== 0 ) faceB.vertexNormals.push( normal );
                }
            }

            if ( hasFaceColor ) {
                colorIndex = faces[ offset ++ ];
                hex = colors[ colorIndex ];
                //                    faceA.color.setHex( hex );
                //                    faceB.color.setHex( hex );
            }

            if ( hasFaceVertexColor ) {
                for ( i = 0; i < 4; i++ ) {
                    colorIndex = faces[ offset ++ ];
                    hex = colors[ colorIndex ];

                    //                        if ( i !== 2 ) faceA.vertexColors.push( new THREE.Color( hex ) );
                    //                        if ( i !== 0 ) faceB.vertexColors.push( new THREE.Color( hex ) );
                }
            }

            geometry.faces.push( faceA );
            geometry.faces.push( faceB );

        } else {
            face = new Face3();
            face.a = faces[ offset ++ ];
            face.b = faces[ offset ++ ];
            face.c = faces[ offset ++ ];

            if ( hasMaterial ) {
                materialIndex = faces[ offset ++ ];
                face.materialIndex = materialIndex;
            }

            // to get face <=> uv index correspondence

            fi = geometry.faces.length;

            if ( hasFaceVertexUv ) {

                for ( i = 0; i < nUvLayers; i++ ) {

                    uvLayer = json.uvs[ i ];

                    geometry.faceVertexUvs[ i ][ fi ] = [];

                    for ( j = 0; j < 3; j ++ ) {

                        uvIndex = faces[ offset ++ ];

                        u = uvLayer[ uvIndex * 2 ];
                        v = uvLayer[ uvIndex * 2 + 1 ];

                        uv = new Vector2( u, v );

                        geometry.faceVertexUvs[ i ][ fi ].push( uv );

                    }

                }

            }

            if ( hasFaceNormal ) {

                normalIndex = faces[ offset ++ ] * 3;

                face.normal.set(
                            normals[ normalIndex ++ ],
                            normals[ normalIndex ++ ],
                            normals[ normalIndex ]
                            );

            }

            if ( hasFaceVertexNormal ) {

                for ( i = 0; i < 3; i++ ) {

                    normalIndex = faces[ offset ++ ] * 3;

                    normal = new Vector3(
                                normals[ normalIndex ++ ],
                                normals[ normalIndex ++ ],
                                normals[ normalIndex ]
                                );

                    face.vertexNormals.push( normal );

                }

            }


            if ( hasFaceColor ) {
                //                    colorIndex = faces[ offset ];
                offset++;
                //                    face.color.setHex( colors[ colorIndex ] );
            }


            if ( hasFaceVertexColor ) {

                for ( i = 0; i < 3; i++ ) {

                    //                        colorIndex = faces[offset];
                    offset++;
                    //                        face.vertexColors.push( new THREE.Color( colors[ colorIndex ] ) );

                }

            }

            geometry.faces.push( face );

        }

    }
};