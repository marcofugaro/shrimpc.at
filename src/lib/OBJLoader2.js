import * as THREE from 'three'
import { MTLLoader } from 'three/examples/js/loaders/MTLLoader'

THREE.MTLLoader = MTLLoader

/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

if (THREE.LoaderSupport === undefined) {
  THREE.LoaderSupport = {}
}

/**
 * Validation functions.
 * @class
 */
THREE.LoaderSupport.Validator = {
  /**
   * If given input is null or undefined, false is returned otherwise true.
   *
   * @param input Can be anything
   * @returns {boolean}
   */
  isValid: function(input) {
    return input !== null && input !== undefined
  },
  /**
   * If given input is null or undefined, the defaultValue is returned otherwise the given input.
   *
   * @param input Can be anything
   * @param defaultValue Can be anything
   * @returns {*}
   */
  verifyInput: function(input, defaultValue) {
    return input === null || input === undefined ? defaultValue : input
  },
}

/**
 * Callbacks utilized by loaders and builders.
 * @class
 */
THREE.LoaderSupport.Callbacks = (function() {
  var Validator = THREE.LoaderSupport.Validator

  function Callbacks() {
    this.onProgress = null
    this.onReportError = null
    this.onMeshAlter = null
    this.onLoad = null
    this.onLoadMaterials = null
  }

  /**
   * Register callback function that is invoked by internal function "announceProgress" to print feedback.
   * @memberOf THREE.LoaderSupport.Callbacks
   *
   * @param {callback} callbackOnProgress Callback function for described functionality
   */
  Callbacks.prototype.setCallbackOnProgress = function(callbackOnProgress) {
    this.onProgress = Validator.verifyInput(callbackOnProgress, this.onProgress)
  }

  /**
   * Register callback function that is invoked when an error is reported.
   * @memberOf THREE.LoaderSupport.Callbacks
   *
   * @param {callback} callbackOnReportError Callback function for described functionality
   */
  Callbacks.prototype.setCallbackOnReportError = function(callbackOnReportError) {
    this.onReportError = Validator.verifyInput(callbackOnReportError, this.onReportError)
  }

  /**
   * Register callback function that is called every time a mesh was loaded.
   * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
   * @memberOf THREE.LoaderSupport.Callbacks
   *
   * @param {callback} callbackOnMeshAlter Callback function for described functionality
   */
  Callbacks.prototype.setCallbackOnMeshAlter = function(callbackOnMeshAlter) {
    this.onMeshAlter = Validator.verifyInput(callbackOnMeshAlter, this.onMeshAlter)
  }

  /**
   * Register callback function that is called once loading of the complete OBJ file is completed.
   * @memberOf THREE.LoaderSupport.Callbacks
   *
   * @param {callback} callbackOnLoad Callback function for described functionality
   */
  Callbacks.prototype.setCallbackOnLoad = function(callbackOnLoad) {
    this.onLoad = Validator.verifyInput(callbackOnLoad, this.onLoad)
  }

  /**
   * Register callback function that is called when materials have been loaded.
   * @memberOf THREE.LoaderSupport.Callbacks
   *
   * @param {callback} callbackOnLoadMaterials Callback function for described functionality
   */
  Callbacks.prototype.setCallbackOnLoadMaterials = function(callbackOnLoadMaterials) {
    this.onLoadMaterials = Validator.verifyInput(callbackOnLoadMaterials, this.onLoadMaterials)
  }

  return Callbacks
})()

/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
THREE.LoaderSupport.LoadedMeshUserOverride = (function() {
  function LoadedMeshUserOverride(disregardMesh, alteredMesh) {
    this.disregardMesh = disregardMesh === true
    this.alteredMesh = alteredMesh === true
    this.meshes = []
  }

  /**
   * Add a mesh created within callback.
   *
   * @memberOf THREE.OBJLoader2.LoadedMeshUserOverride
   *
   * @param {THREE.Mesh} mesh
   */
  LoadedMeshUserOverride.prototype.addMesh = function(mesh) {
    this.meshes.push(mesh)
    this.alteredMesh = true
  }

  /**
   * Answers if mesh shall be disregarded completely.
   *
   * @returns {boolean}
   */
  LoadedMeshUserOverride.prototype.isDisregardMesh = function() {
    return this.disregardMesh
  }

  /**
   * Answers if new mesh(es) were created.
   *
   * @returns {boolean}
   */
  LoadedMeshUserOverride.prototype.providesAlteredMeshes = function() {
    return this.alteredMesh
  }

  return LoadedMeshUserOverride
})()

/**
 * A resource description used by {@link THREE.LoaderSupport.PrepData} and others.
 * @class
 *
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 */
THREE.LoaderSupport.ResourceDescriptor = (function() {
  var Validator = THREE.LoaderSupport.Validator

  function ResourceDescriptor(url, extension) {
    var urlParts = url.split('/')

    if (urlParts.length < 2) {
      this.path = null
      this.name = url
      this.url = url
    } else {
      this.path = Validator.verifyInput(
        urlParts.slice(0, urlParts.length - 1).join('/') + '/',
        null,
      )
      this.name = urlParts[urlParts.length - 1]
      this.url = url
    }
    this.name = Validator.verifyInput(this.name, 'Unnamed_Resource')
    this.extension = Validator.verifyInput(extension, 'default')
    this.extension = this.extension.trim()
    this.content = null
  }

  /**
   * Set the content of this resource
   * @memberOf THREE.LoaderSupport.ResourceDescriptor
   *
   * @param {Object} content The file content as arraybuffer or text
   */
  ResourceDescriptor.prototype.setContent = function(content) {
    this.content = Validator.verifyInput(content, null)
  }

  return ResourceDescriptor
})()

/**
 * Configuration instructions to be used by run method.
 * @class
 */
THREE.LoaderSupport.PrepData = (function() {
  var Validator = THREE.LoaderSupport.Validator

  function PrepData(modelName) {
    this.logging = {
      enabled: true,
      debug: false,
    }
    this.modelName = Validator.verifyInput(modelName, '')
    this.resources = []
    this.callbacks = new THREE.LoaderSupport.Callbacks()
  }

  /**
   * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
   * @memberOf THREE.LoaderSupport.PrepData
   *
   * @param {boolean} enabled True or false.
   * @param {boolean} debug True or false.
   */
  PrepData.prototype.setLogging = function(enabled, debug) {
    this.logging.enabled = enabled === true
    this.logging.debug = debug === true
  }

  /**
   * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
   * @memberOf THREE.LoaderSupport.PrepData
   *
   * @returns {THREE.LoaderSupport.Callbacks}
   */
  PrepData.prototype.getCallbacks = function() {
    return this.callbacks
  }

  /**
   * Add a resource description.
   * @memberOf THREE.LoaderSupport.PrepData
   *
   * @param {THREE.LoaderSupport.ResourceDescriptor} Adds a {@link THREE.LoaderSupport.ResourceDescriptor}
   */
  PrepData.prototype.addResource = function(resource) {
    this.resources.push(resource)
  }

  /**
   * Clones this object and returns it afterwards. Callbacks and resources are not cloned deep (references!).
   * @memberOf THREE.LoaderSupport.PrepData
   *
   * @returns {@link THREE.LoaderSupport.PrepData}
   */
  PrepData.prototype.clone = function() {
    var clone = new THREE.LoaderSupport.PrepData(this.modelName)
    clone.logging.enabled = this.logging.enabled
    clone.logging.debug = this.logging.debug
    clone.resources = this.resources
    clone.callbacks = this.callbacks

    var property, value
    for (property in this) {
      value = this[property]
      if (!clone.hasOwnProperty(property) && typeof this[property] !== 'function') {
        clone[property] = value
      }
    }

    return clone
  }

  /**
   * Identify files or content of interest from an Array of {@link THREE.LoaderSupport.ResourceDescriptor}.
   * @memberOf THREE.LoaderSupport.PrepData
   *
   * @param {THREE.LoaderSupport.ResourceDescriptor[]} resources Array of {@link THREE.LoaderSupport.ResourceDescriptor}
   * @param Object fileDesc Object describing which resources are of interest (ext, type (string or UInt8Array) and ignore (boolean))
   * @returns {{}} Object with each "ext" and the corresponding {@link THREE.LoaderSupport.ResourceDescriptor}
   */
  PrepData.prototype.checkResourceDescriptorFiles = function(resources, fileDesc) {
    var resource, triple, i, found
    var result = {}

    for (var index in resources) {
      resource = resources[index]
      found = false
      if (!Validator.isValid(resource.name)) continue
      if (Validator.isValid(resource.content)) {
        for (i = 0; i < fileDesc.length && !found; i++) {
          triple = fileDesc[i]
          if (resource.extension.toLowerCase() === triple.ext.toLowerCase()) {
            if (triple.ignore) {
              found = true
            } else if (triple.type === 'ArrayBuffer') {
              // fast-fail on bad type
              if (
                !(resource.content instanceof ArrayBuffer || resource.content instanceof Uint8Array)
              )
                throw 'Provided content is not of type ArrayBuffer! Aborting...'
              result[triple.ext] = resource
              found = true
            } else if (triple.type === 'String') {
              if (!(typeof resource.content === 'string' || resource.content instanceof String))
                throw 'Provided  content is not of type String! Aborting...'
              result[triple.ext] = resource
              found = true
            }
          }
        }
        if (!found) throw 'Unidentified resource "' + resource.name + '": ' + resource.url
      } else {
        // fast-fail on bad type
        if (!(typeof resource.name === 'string' || resource.name instanceof String))
          throw 'Provided file is not properly defined! Aborting...'
        for (i = 0; i < fileDesc.length && !found; i++) {
          triple = fileDesc[i]
          if (resource.extension.toLowerCase() === triple.ext.toLowerCase()) {
            if (!triple.ignore) result[triple.ext] = resource
            found = true
          }
        }
        if (!found) throw 'Unidentified resource "' + resource.name + '": ' + resource.url
      }
    }

    return result
  }

  return PrepData
})()

/**
 * Builds one or many THREE.Mesh from one raw set of Arraybuffers, materialGroup descriptions and further parameters.
 * Supports vertex, vertexColor, normal, uv and index buffers.
 * @class
 */
THREE.LoaderSupport.MeshBuilder = (function() {
  var LOADER_MESH_BUILDER_VERSION = '1.2.2'

  var Validator = THREE.LoaderSupport.Validator

  function MeshBuilder() {
    this.logging = {
      enabled: true,
      debug: false,
    }

    this.callbacks = new THREE.LoaderSupport.Callbacks()
    this.materials = []
  }

  /**
   * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   * @param {boolean} enabled True or false.
   * @param {boolean} debug True or false.
   */
  MeshBuilder.prototype.setLogging = function(enabled, debug) {
    this.logging.enabled = enabled === true
    this.logging.debug = debug === true
  }

  /**
   * Initializes the MeshBuilder (currently only default material initialisation).
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   */
  MeshBuilder.prototype.init = function() {
    var defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xdcf1ff })
    defaultMaterial.name = 'defaultMaterial'

    var defaultVertexColorMaterial = new THREE.MeshStandardMaterial({ color: 0xdcf1ff })
    defaultVertexColorMaterial.name = 'defaultVertexColorMaterial'
    defaultVertexColorMaterial.vertexColors = THREE.VertexColors

    var defaultLineMaterial = new THREE.LineBasicMaterial()
    defaultLineMaterial.name = 'defaultLineMaterial'

    var defaultPointMaterial = new THREE.PointsMaterial({ size: 1 })
    defaultPointMaterial.name = 'defaultPointMaterial'

    var runtimeMaterials = {}
    runtimeMaterials[defaultMaterial.name] = defaultMaterial
    runtimeMaterials[defaultVertexColorMaterial.name] = defaultVertexColorMaterial
    runtimeMaterials[defaultLineMaterial.name] = defaultLineMaterial
    runtimeMaterials[defaultPointMaterial.name] = defaultPointMaterial

    this.updateMaterials({
      cmd: 'materialData',
      materials: {
        materialCloneInstructions: null,
        serializedMaterials: null,
        runtimeMaterials: runtimeMaterials,
      },
    })
  }

  /**
   * Set materials loaded by any supplier of an Array of {@link THREE.Material}.
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   * @param {THREE.Material[]} materials Array of {@link THREE.Material}
   */
  MeshBuilder.prototype.setMaterials = function(materials) {
    var payload = {
      cmd: 'materialData',
      materials: {
        materialCloneInstructions: null,
        serializedMaterials: null,
        runtimeMaterials: Validator.isValid(this.callbacks.onLoadMaterials)
          ? this.callbacks.onLoadMaterials(materials)
          : materials,
      },
    }
    this.updateMaterials(payload)
  }

  MeshBuilder.prototype._setCallbacks = function(callbacks) {
    if (Validator.isValid(callbacks.onProgress))
      this.callbacks.setCallbackOnProgress(callbacks.onProgress)
    if (Validator.isValid(callbacks.onReportError))
      this.callbacks.setCallbackOnReportError(callbacks.onReportError)
    if (Validator.isValid(callbacks.onMeshAlter))
      this.callbacks.setCallbackOnMeshAlter(callbacks.onMeshAlter)
    if (Validator.isValid(callbacks.onLoad)) this.callbacks.setCallbackOnLoad(callbacks.onLoad)
    if (Validator.isValid(callbacks.onLoadMaterials))
      this.callbacks.setCallbackOnLoadMaterials(callbacks.onLoadMaterials)
  }

  /**
   * Delegates processing of the payload (mesh building or material update) to the corresponding functions (BW-compatibility).
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   * @param {Object} payload Raw Mesh or Material descriptions.
   * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh} or null in case of material update
   */
  MeshBuilder.prototype.processPayload = function(payload) {
    if (payload.cmd === 'meshData') {
      return this.buildMeshes(payload)
    } else if (payload.cmd === 'materialData') {
      this.updateMaterials(payload)
      return null
    }
  }

  /**
   * Builds one or multiple meshes from the data described in the payload (buffers, params, material info).
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   * @param {Object} meshPayload Raw mesh description (buffers, params, materials) used to build one to many meshes.
   * @returns {THREE.Mesh[]} mesh Array of {@link THREE.Mesh}
   */
  MeshBuilder.prototype.buildMeshes = function(meshPayload) {
    var meshName = meshPayload.params.meshName

    var bufferGeometry = new THREE.BufferGeometry()
    bufferGeometry.addAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(meshPayload.buffers.vertices), 3),
    )
    if (Validator.isValid(meshPayload.buffers.indices)) {
      bufferGeometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(meshPayload.buffers.indices), 1),
      )
    }
    var haveVertexColors = Validator.isValid(meshPayload.buffers.colors)
    if (haveVertexColors) {
      bufferGeometry.addAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(meshPayload.buffers.colors), 3),
      )
    }
    if (Validator.isValid(meshPayload.buffers.normals)) {
      bufferGeometry.addAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(meshPayload.buffers.normals), 3),
      )
    } else {
      bufferGeometry.computeVertexNormals()
    }
    if (Validator.isValid(meshPayload.buffers.uvs)) {
      bufferGeometry.addAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(meshPayload.buffers.uvs), 2),
      )
    }

    var material, materialName, key
    var materialNames = meshPayload.materials.materialNames
    var createMultiMaterial = meshPayload.materials.multiMaterial
    var multiMaterials = []
    for (key in materialNames) {
      materialName = materialNames[key]
      material = this.materials[materialName]
      if (createMultiMaterial) multiMaterials.push(material)
    }
    if (createMultiMaterial) {
      material = multiMaterials
      var materialGroups = meshPayload.materials.materialGroups
      var materialGroup
      for (key in materialGroups) {
        materialGroup = materialGroups[key]
        bufferGeometry.addGroup(materialGroup.start, materialGroup.count, materialGroup.index)
      }
    }

    var meshes = []
    var mesh
    var callbackOnMeshAlter = this.callbacks.onMeshAlter
    var callbackOnMeshAlterResult
    var useOrgMesh = true
    var geometryType = Validator.verifyInput(meshPayload.geometryType, 0)
    if (Validator.isValid(callbackOnMeshAlter)) {
      callbackOnMeshAlterResult = callbackOnMeshAlter({
        detail: {
          meshName: meshName,
          bufferGeometry: bufferGeometry,
          material: material,
          geometryType: geometryType,
        },
      })
      if (Validator.isValid(callbackOnMeshAlterResult)) {
        if (callbackOnMeshAlterResult.isDisregardMesh()) {
          useOrgMesh = false
        } else if (callbackOnMeshAlterResult.providesAlteredMeshes()) {
          for (var i in callbackOnMeshAlterResult.meshes) {
            meshes.push(callbackOnMeshAlterResult.meshes[i])
          }
          useOrgMesh = false
        }
      }
    }
    if (useOrgMesh) {
      if (meshPayload.computeBoundingSphere) bufferGeometry.computeBoundingSphere()
      if (geometryType === 0) {
        mesh = new THREE.Mesh(bufferGeometry, material)
      } else if (geometryType === 1) {
        mesh = new THREE.LineSegments(bufferGeometry, material)
      } else {
        mesh = new THREE.Points(bufferGeometry, material)
      }
      mesh.name = meshName
      meshes.push(mesh)
    }

    var progressMessage
    if (Validator.isValid(meshes) && meshes.length > 0) {
      var meshNames = []
      for (var i in meshes) {
        mesh = meshes[i]
        meshNames[i] = mesh.name
      }
      progressMessage =
        'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName
      progressMessage += ' (' + (meshPayload.progress.numericalValue * 100).toFixed(2) + '%)'
    } else {
      progressMessage = 'Not adding mesh: ' + meshName
      progressMessage += ' (' + (meshPayload.progress.numericalValue * 100).toFixed(2) + '%)'
    }
    var callbackOnProgress = this.callbacks.onProgress
    if (Validator.isValid(callbackOnProgress)) {
      var event = new CustomEvent('MeshBuilderEvent', {
        detail: {
          type: 'progress',
          modelName: meshPayload.params.meshName,
          text: progressMessage,
          numericalValue: meshPayload.progress.numericalValue,
        },
      })
      callbackOnProgress(event)
    }

    return meshes
  }

  /**
   * Updates the materials with contained material objects (sync) or from alteration instructions (async).
   * @memberOf THREE.LoaderSupport.MeshBuilder
   *
   * @param {Object} materialPayload Material update instructions
   */
  MeshBuilder.prototype.updateMaterials = function(materialPayload) {
    var material, materialName
    var materialCloneInstructions = materialPayload.materials.materialCloneInstructions
    if (Validator.isValid(materialCloneInstructions)) {
      var materialNameOrg = materialCloneInstructions.materialNameOrg
      var materialOrg = this.materials[materialNameOrg]

      if (Validator.isValid(materialNameOrg)) {
        material = materialOrg.clone()

        materialName = materialCloneInstructions.materialName
        material.name = materialName

        var materialProperties = materialCloneInstructions.materialProperties
        for (var key in materialProperties) {
          if (material.hasOwnProperty(key) && materialProperties.hasOwnProperty(key))
            material[key] = materialProperties[key]
        }
        this.materials[materialName] = material
      } else {
        console.warn('Requested material "' + materialNameOrg + '" is not available!')
      }
    }

    var materials = materialPayload.materials.serializedMaterials
    if (Validator.isValid(materials) && Object.keys(materials).length > 0) {
      var loader = new THREE.MaterialLoader()
      var materialJson
      for (materialName in materials) {
        materialJson = materials[materialName]
        if (Validator.isValid(materialJson)) {
          material = loader.parse(materialJson)
          if (this.logging.enabled)
            console.info('De-serialized material with name "' + materialName + '" will be added.')
          this.materials[materialName] = material
        }
      }
    }

    materials = materialPayload.materials.runtimeMaterials
    if (Validator.isValid(materials) && Object.keys(materials).length > 0) {
      for (materialName in materials) {
        material = materials[materialName]
        if (this.logging.enabled)
          console.info('Material with name "' + materialName + '" will be added.')
        this.materials[materialName] = material
      }
    }
  }

  /**
   * Returns the mapping object of material name and corresponding jsonified material.
   *
   * @returns {Object} Map of Materials in JSON representation
   */
  MeshBuilder.prototype.getMaterialsJSON = function() {
    var materialsJSON = {}
    var material
    for (var materialName in this.materials) {
      material = this.materials[materialName]
      materialsJSON[materialName] = material.toJSON()
    }

    return materialsJSON
  }

  /**
   * Returns the mapping object of material name and corresponding material.
   *
   * @returns {Object} Map of {@link THREE.Material}
   */
  MeshBuilder.prototype.getMaterials = function() {
    return this.materials
  }

  return MeshBuilder
})()

/**
 * Default implementation of the WorkerRunner responsible for creation and configuration of the parser within the worker.
 *
 * @class
 */
THREE.LoaderSupport.WorkerRunnerRefImpl = (function() {
  function WorkerRunnerRefImpl() {
    var scope = this
    var scopedRunner = function(event) {
      scope.processMessage(event.data)
    }
    self.addEventListener('message', scopedRunner, false)
  }

  /**
   * Applies values from parameter object via set functions or via direct assignment.
   * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
   *
   * @param {Object} parser The parser instance
   * @param {Object} params The parameter object
   */
  WorkerRunnerRefImpl.prototype.applyProperties = function(parser, params) {
    var property, funcName, values
    for (property in params) {
      funcName = 'set' + property.substring(0, 1).toLocaleUpperCase() + property.substring(1)
      values = params[property]

      if (typeof parser[funcName] === 'function') {
        parser[funcName](values)
      } else if (parser.hasOwnProperty(property)) {
        parser[property] = values
      }
    }
  }

  /**
   * Configures the Parser implementation according the supplied configuration object.
   * @memberOf THREE.LoaderSupport.WorkerRunnerRefImpl
   *
   * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
   */
  WorkerRunnerRefImpl.prototype.processMessage = function(payload) {
    if (payload.cmd === 'run') {
      var callbacks = {
        callbackMeshBuilder: function(payload) {
          self.postMessage(payload)
        },
        callbackProgress: function(text) {
          if (payload.logging.enabled && payload.logging.debug)
            console.debug('WorkerRunner: progress: ' + text)
        },
      }

      // Parser is expected to be named as such
      var parser = new Parser()
      if (typeof parser['setLogging'] === 'function')
        parser.setLogging(payload.logging.enabled, payload.logging.debug)
      this.applyProperties(parser, payload.params)
      this.applyProperties(parser, payload.materials)
      this.applyProperties(parser, callbacks)
      parser.workerScope = self
      parser.parse(payload.data.input, payload.data.options)

      if (payload.logging.enabled) console.log('WorkerRunner: Run complete!')

      callbacks.callbackMeshBuilder({
        cmd: 'complete',
        msg: 'WorkerRunner completed run.',
      })
    } else {
      console.error('WorkerRunner: Received unknown command: ' + payload.cmd)
    }
  }

  return WorkerRunnerRefImpl
})()

/**
 * This class provides means to transform existing parser code into a web worker. It defines a simple communication protocol
 * which allows to configure the worker and receive raw mesh data during execution.
 * @class
 */
THREE.LoaderSupport.WorkerSupport = (function() {
  var WORKER_SUPPORT_VERSION = '2.2.1'

  var Validator = THREE.LoaderSupport.Validator

  var LoaderWorker = (function() {
    function LoaderWorker() {
      this._reset()
    }

    LoaderWorker.prototype._reset = function() {
      this.logging = {
        enabled: true,
        debug: false,
      }
      this.worker = null
      this.runnerImplName = null
      this.callbacks = {
        meshBuilder: null,
        onLoad: null,
      }
      this.terminateRequested = false
      this.queuedMessage = null
      this.started = false
      this.forceCopy = false
    }

    LoaderWorker.prototype.setLogging = function(enabled, debug) {
      this.logging.enabled = enabled === true
      this.logging.debug = debug === true
    }

    LoaderWorker.prototype.setForceCopy = function(forceCopy) {
      this.forceCopy = forceCopy === true
    }

    LoaderWorker.prototype.initWorker = function(code, runnerImplName) {
      this.runnerImplName = runnerImplName
      var blob = new Blob([code], { type: 'application/javascript' })
      this.worker = new Worker(window.URL.createObjectURL(blob))
      this.worker.onmessage = this._receiveWorkerMessage

      // set referemce to this, then processing in worker scope within "_receiveWorkerMessage" can access members
      this.worker.runtimeRef = this

      // process stored queuedMessage
      this._postMessage()
    }

    /**
     * Executed in worker scope
     */
    LoaderWorker.prototype._receiveWorkerMessage = function(e) {
      var payload = e.data
      switch (payload.cmd) {
        case 'meshData':
        case 'materialData':
        case 'imageData':
          this.runtimeRef.callbacks.meshBuilder(payload)
          break

        case 'complete':
          this.runtimeRef.queuedMessage = null
          this.started = false
          this.runtimeRef.callbacks.onLoad(payload.msg)

          if (this.runtimeRef.terminateRequested) {
            if (this.runtimeRef.logging.enabled)
              console.info(
                'WorkerSupport [' +
                  this.runtimeRef.runnerImplName +
                  ']: Run is complete. Terminating application on request!',
              )
            this.runtimeRef._terminate()
          }
          break

        case 'error':
          console.error(
            'WorkerSupport [' +
              this.runtimeRef.runnerImplName +
              ']: Reported error: ' +
              payload.msg,
          )
          this.runtimeRef.queuedMessage = null
          this.started = false
          this.runtimeRef.callbacks.onLoad(payload.msg)

          if (this.runtimeRef.terminateRequested) {
            if (this.runtimeRef.logging.enabled)
              console.info(
                'WorkerSupport [' +
                  this.runtimeRef.runnerImplName +
                  ']: Run reported error. Terminating application on request!',
              )
            this.runtimeRef._terminate()
          }
          break

        default:
          console.error(
            'WorkerSupport [' +
              this.runtimeRef.runnerImplName +
              ']: Received unknown command: ' +
              payload.cmd,
          )
          break
      }
    }

    LoaderWorker.prototype.setCallbacks = function(meshBuilder, onLoad) {
      this.callbacks.meshBuilder = Validator.verifyInput(meshBuilder, this.callbacks.meshBuilder)
      this.callbacks.onLoad = Validator.verifyInput(onLoad, this.callbacks.onLoad)
    }

    LoaderWorker.prototype.run = function(payload) {
      if (Validator.isValid(this.queuedMessage)) {
        console.warn('Already processing message. Rejecting new run instruction')
        return
      } else {
        this.queuedMessage = payload
        this.started = true
      }
      if (!Validator.isValid(this.callbacks.meshBuilder))
        throw 'Unable to run as no "MeshBuilder" callback is set.'
      if (!Validator.isValid(this.callbacks.onLoad))
        throw 'Unable to run as no "onLoad" callback is set.'
      if (payload.cmd !== 'run') payload.cmd = 'run'
      if (Validator.isValid(payload.logging)) {
        payload.logging.enabled = payload.logging.enabled === true
        payload.logging.debug = payload.logging.debug === true
      } else {
        payload.logging = {
          enabled: true,
          debug: false,
        }
      }
      this._postMessage()
    }

    LoaderWorker.prototype._postMessage = function() {
      if (Validator.isValid(this.queuedMessage) && Validator.isValid(this.worker)) {
        if (this.queuedMessage.data.input instanceof ArrayBuffer) {
          var content
          if (this.forceCopy) {
            content = this.queuedMessage.data.input.slice(0)
          } else {
            content = this.queuedMessage.data.input
          }
          this.worker.postMessage(this.queuedMessage, [content])
        } else {
          this.worker.postMessage(this.queuedMessage)
        }
      }
    }

    LoaderWorker.prototype.setTerminateRequested = function(terminateRequested) {
      this.terminateRequested = terminateRequested === true
      if (
        this.terminateRequested &&
        Validator.isValid(this.worker) &&
        !Validator.isValid(this.queuedMessage) &&
        this.started
      ) {
        if (this.logging.enabled)
          console.info('Worker is terminated immediately as it is not running!')
        this._terminate()
      }
    }

    LoaderWorker.prototype._terminate = function() {
      this.worker.terminate()
      this._reset()
    }

    return LoaderWorker
  })()

  function WorkerSupport() {
    this.logging = {
      enabled: true,
      debug: false,
    }

    // check worker support first
    if (window.Worker === undefined) throw 'This browser does not support web workers!'
    if (window.Blob === undefined) throw 'This browser does not support Blob!'
    if (typeof window.URL.createObjectURL !== 'function')
      throw 'This browser does not support Object creation from URL!'

    this.loaderWorker = new LoaderWorker()
  }

  /**
   * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {boolean} enabled True or false.
   * @param {boolean} debug True or false.
   */
  WorkerSupport.prototype.setLogging = function(enabled, debug) {
    this.logging.enabled = enabled === true
    this.logging.debug = debug === true
    this.loaderWorker.setLogging(this.logging.enabled, this.logging.debug)
  }

  /**
   * Forces all ArrayBuffers to be transferred to worker to be copied.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {boolean} forceWorkerDataCopy True or false.
   */
  WorkerSupport.prototype.setForceWorkerDataCopy = function(forceWorkerDataCopy) {
    this.loaderWorker.setForceCopy(forceWorkerDataCopy)
  }

  /**
   * Validate the status of worker code and the derived worker.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {Function} functionCodeBuilder Function that is invoked with funcBuildObject and funcBuildSingleton that allows stringification of objects and singletons.
   * @param {String} parserName Name of the Parser object
   * @param {String[]} libLocations URL of libraries that shall be added to worker code relative to libPath
   * @param {String} libPath Base path used for loading libraries
   * @param {THREE.LoaderSupport.WorkerRunnerRefImpl} runnerImpl The default worker parser wrapper implementation (communication and execution). An extended class could be passed here.
   */
  WorkerSupport.prototype.validate = function(
    functionCodeBuilder,
    parserName,
    libLocations,
    libPath,
    runnerImpl,
  ) {
    if (Validator.isValid(this.loaderWorker.worker)) return

    if (this.logging.enabled) {
      console.info('WorkerSupport: Building worker code...')
      console.time('buildWebWorkerCode')
    }
    if (Validator.isValid(runnerImpl)) {
      if (this.logging.enabled)
        console.info('WorkerSupport: Using "' + runnerImpl.name + '" as Runner class for worker.')
    } else {
      runnerImpl = THREE.LoaderSupport.WorkerRunnerRefImpl
      if (this.logging.enabled)
        console.info(
          'WorkerSupport: Using DEFAULT "THREE.LoaderSupport.WorkerRunnerRefImpl" as Runner class for worker.',
        )
    }

    var userWorkerCode = functionCodeBuilder(buildObject, buildSingleton)
    userWorkerCode += 'var Parser = ' + parserName + ';\n\n'
    userWorkerCode += buildSingleton(runnerImpl.name, runnerImpl)
    userWorkerCode += 'new ' + runnerImpl.name + '();\n\n'

    var scope = this
    if (Validator.isValid(libLocations) && libLocations.length > 0) {
      var libsContent = ''
      var loadAllLibraries = function(path, locations) {
        if (locations.length === 0) {
          scope.loaderWorker.initWorker(libsContent + userWorkerCode, runnerImpl.name)
          if (scope.logging.enabled) console.timeEnd('buildWebWorkerCode')
        } else {
          var loadedLib = function(contentAsString) {
            libsContent += contentAsString
            loadAllLibraries(path, locations)
          }

          var fileLoader = new THREE.FileLoader()
          fileLoader.setPath(path)
          fileLoader.setResponseType('text')
          fileLoader.load(locations[0], loadedLib)
          locations.shift()
        }
      }
      loadAllLibraries(libPath, libLocations)
    } else {
      this.loaderWorker.initWorker(userWorkerCode, runnerImpl.name)
      if (this.logging.enabled) console.timeEnd('buildWebWorkerCode')
    }
  }

  /**
   * Specify functions that should be build when new raw mesh data becomes available and when the parser is finished.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {Function} meshBuilder The mesh builder function. Default is {@link THREE.LoaderSupport.MeshBuilder}.
   * @param {Function} onLoad The function that is called when parsing is complete.
   */
  WorkerSupport.prototype.setCallbacks = function(meshBuilder, onLoad) {
    this.loaderWorker.setCallbacks(meshBuilder, onLoad)
  }

  /**
   * Runs the parser with the provided configuration.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {Object} payload Raw mesh description (buffers, params, materials) used to build one to many meshes.
   */
  WorkerSupport.prototype.run = function(payload) {
    this.loaderWorker.run(payload)
  }

  /**
   * Request termination of worker once parser is finished.
   * @memberOf THREE.LoaderSupport.WorkerSupport
   *
   * @param {boolean} terminateRequested True or false.
   */
  WorkerSupport.prototype.setTerminateRequested = function(terminateRequested) {
    this.loaderWorker.setTerminateRequested(terminateRequested)
  }

  var buildObject = function(fullName, object) {
    var objectString = fullName + ' = {\n'
    var part
    for (var name in object) {
      part = object[name]
      if (typeof part === 'string' || part instanceof String) {
        part = part.replace('\n', '\\n')
        part = part.replace('\r', '\\r')
        objectString += '\t' + name + ': "' + part + '",\n'
      } else if (part instanceof Array) {
        objectString += '\t' + name + ': [' + part + '],\n'
      } else if (Number.isInteger(part)) {
        objectString += '\t' + name + ': ' + part + ',\n'
      } else if (typeof part === 'function') {
        objectString += '\t' + name + ': ' + part + ',\n'
      }
    }
    objectString += '}\n\n'

    return objectString
  }

  var buildSingleton = function(
    fullName,
    object,
    internalName,
    basePrototypeName,
    ignoreFunctions,
  ) {
    var objectString = ''
    var objectName = Validator.isValid(internalName) ? internalName : object.name

    var funcString, objectPart, constructorString
    ignoreFunctions = Validator.verifyInput(ignoreFunctions, [])
    for (var name in object.prototype) {
      objectPart = object.prototype[name]
      if (name === 'constructor') {
        funcString = objectPart.toString()
        funcString = funcString.replace('function', '')
        constructorString = '\tfunction ' + objectName + funcString + ';\n\n'
      } else if (typeof objectPart === 'function') {
        if (ignoreFunctions.indexOf(name) < 0) {
          funcString = objectPart.toString()
          objectString += '\t' + objectName + '.prototype.' + name + ' = ' + funcString + ';\n\n'
        }
      }
    }
    objectString += '\treturn ' + objectName + ';\n'
    objectString += '})();\n\n'

    var inheritanceBlock = ''
    if (Validator.isValid(basePrototypeName)) {
      inheritanceBlock += '\n'
      inheritanceBlock +=
        objectName + '.prototype = Object.create( ' + basePrototypeName + '.prototype );\n'
      inheritanceBlock += objectName + '.constructor = ' + objectName + ';\n'
      inheritanceBlock += '\n'
    }
    if (!Validator.isValid(constructorString)) {
      constructorString = fullName + ' = (function () {\n\n'
      constructorString +=
        inheritanceBlock + '\t' + object.prototype.constructor.toString() + '\n\n'
      objectString = constructorString + objectString
    } else {
      objectString =
        fullName + ' = (function () {\n\n' + inheritanceBlock + constructorString + objectString
    }

    return objectString
  }

  return WorkerSupport
})()

/**
 * Orchestrate loading of multiple OBJ files/data from an instruction queue with a configurable amount of workers (1-16).
 * Workflow:
 *   prepareWorkers
 *   enqueueForRun
 *   processQueue
 *   tearDown (to force stop)
 *
 * @class
 *
 * @param {string} classDef Class definition to be used for construction
 */
THREE.LoaderSupport.WorkerDirector = (function() {
  var LOADER_WORKER_DIRECTOR_VERSION = '2.2.2'

  var Validator = THREE.LoaderSupport.Validator

  var MAX_WEB_WORKER = 16
  var MAX_QUEUE_SIZE = 8192

  function WorkerDirector(classDef) {
    console.info(
      'Using THREE.LoaderSupport.WorkerDirector version: ' + LOADER_WORKER_DIRECTOR_VERSION,
    )
    this.logging = {
      enabled: true,
      debug: false,
    }

    this.maxQueueSize = MAX_QUEUE_SIZE
    this.maxWebWorkers = MAX_WEB_WORKER
    this.crossOrigin = null

    if (!Validator.isValid(classDef)) throw 'Provided invalid classDef: ' + classDef

    this.workerDescription = {
      classDef: classDef,
      globalCallbacks: {},
      workerSupports: {},
      forceWorkerDataCopy: true,
    }
    this.objectsCompleted = 0
    this.instructionQueue = []
    this.instructionQueuePointer = 0

    this.callbackOnFinishedProcessing = null
  }

  /**
   * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {boolean} enabled True or false.
   * @param {boolean} debug True or false.
   */
  WorkerDirector.prototype.setLogging = function(enabled, debug) {
    this.logging.enabled = enabled === true
    this.logging.debug = debug === true
  }

  /**
   * Returns the maximum length of the instruction queue.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @returns {number}
   */
  WorkerDirector.prototype.getMaxQueueSize = function() {
    return this.maxQueueSize
  }

  /**
   * Returns the maximum number of workers.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @returns {number}
   */
  WorkerDirector.prototype.getMaxWebWorkers = function() {
    return this.maxWebWorkers
  }

  /**
   * Sets the CORS string to be used.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {string} crossOrigin CORS value
   */
  WorkerDirector.prototype.setCrossOrigin = function(crossOrigin) {
    this.crossOrigin = crossOrigin
  }

  /**
   * Forces all ArrayBuffers to be transferred to worker to be copied.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {boolean} forceWorkerDataCopy True or false.
   */
  WorkerDirector.prototype.setForceWorkerDataCopy = function(forceWorkerDataCopy) {
    this.workerDescription.forceWorkerDataCopy = forceWorkerDataCopy === true
  }

  /**
   * Create or destroy workers according limits. Set the name and register callbacks for dynamically created web workers.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {THREE.OBJLoader2.WWOBJLoader2.PrepDataCallbacks} globalCallbacks  Register global callbacks used by all web workers
   * @param {number} maxQueueSize Set the maximum size of the instruction queue (1-1024)
   * @param {number} maxWebWorkers Set the maximum amount of workers (1-16)
   */
  WorkerDirector.prototype.prepareWorkers = function(globalCallbacks, maxQueueSize, maxWebWorkers) {
    if (Validator.isValid(globalCallbacks)) this.workerDescription.globalCallbacks = globalCallbacks
    this.maxQueueSize = Math.min(maxQueueSize, MAX_QUEUE_SIZE)
    this.maxWebWorkers = Math.min(maxWebWorkers, MAX_WEB_WORKER)
    this.maxWebWorkers = Math.min(this.maxWebWorkers, this.maxQueueSize)
    this.objectsCompleted = 0
    this.instructionQueue = []
    this.instructionQueuePointer = 0

    for (var instanceNo = 0; instanceNo < this.maxWebWorkers; instanceNo++) {
      var workerSupport = new THREE.LoaderSupport.WorkerSupport()
      workerSupport.setLogging(this.logging.enabled, this.logging.debug)
      workerSupport.setForceWorkerDataCopy(this.workerDescription.forceWorkerDataCopy)
      this.workerDescription.workerSupports[instanceNo] = {
        instanceNo: instanceNo,
        inUse: false,
        terminateRequested: false,
        workerSupport: workerSupport,
        loader: null,
      }
    }
  }

  /**
   * Store run instructions in internal instructionQueue.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {THREE.LoaderSupport.PrepData} prepData
   */
  WorkerDirector.prototype.enqueueForRun = function(prepData) {
    if (this.instructionQueue.length < this.maxQueueSize) {
      this.instructionQueue.push(prepData)
    }
  }

  /**
   * Returns if any workers are running.
   *
   * @memberOf THREE.LoaderSupport.WorkerDirector
   * @returns {boolean}
   */
  WorkerDirector.prototype.isRunning = function() {
    var wsKeys = Object.keys(this.workerDescription.workerSupports)
    return (
      (this.instructionQueue.length > 0 &&
        this.instructionQueuePointer < this.instructionQueue.length) ||
      wsKeys.length > 0
    )
  }

  /**
   * Process the instructionQueue until it is depleted.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   */
  WorkerDirector.prototype.processQueue = function() {
    var prepData, supportDesc
    for (var instanceNo in this.workerDescription.workerSupports) {
      supportDesc = this.workerDescription.workerSupports[instanceNo]
      if (!supportDesc.inUse) {
        if (this.instructionQueuePointer < this.instructionQueue.length) {
          prepData = this.instructionQueue[this.instructionQueuePointer]
          this._kickWorkerRun(prepData, supportDesc)
          this.instructionQueuePointer++
        } else {
          this._deregister(supportDesc)
        }
      }
    }

    if (!this.isRunning() && this.callbackOnFinishedProcessing !== null) {
      this.callbackOnFinishedProcessing()
      this.callbackOnFinishedProcessing = null
    }
  }

  WorkerDirector.prototype._kickWorkerRun = function(prepData, supportDesc) {
    supportDesc.inUse = true
    supportDesc.workerSupport.setTerminateRequested(supportDesc.terminateRequested)

    if (this.logging.enabled)
      console.info(
        '\nAssigning next item from queue to worker (queue length: ' +
          this.instructionQueue.length +
          ')\n\n',
      )

    var scope = this
    var prepDataCallbacks = prepData.getCallbacks()
    var globalCallbacks = this.workerDescription.globalCallbacks
    var wrapperOnLoad = function(event) {
      if (Validator.isValid(globalCallbacks.onLoad)) globalCallbacks.onLoad(event)
      if (Validator.isValid(prepDataCallbacks.onLoad)) prepDataCallbacks.onLoad(event)
      scope.objectsCompleted++
      supportDesc.inUse = false

      scope.processQueue()
    }

    var wrapperOnProgress = function(event) {
      if (Validator.isValid(globalCallbacks.onProgress)) globalCallbacks.onProgress(event)
      if (Validator.isValid(prepDataCallbacks.onProgress)) prepDataCallbacks.onProgress(event)
    }

    var wrapperOnMeshAlter = function(event, override) {
      if (Validator.isValid(globalCallbacks.onMeshAlter))
        override = globalCallbacks.onMeshAlter(event, override)
      if (Validator.isValid(prepDataCallbacks.onMeshAlter))
        override = globalCallbacks.onMeshAlter(event, override)
      return override
    }

    var wrapperOnLoadMaterials = function(materials) {
      if (Validator.isValid(globalCallbacks.onLoadMaterials))
        materials = globalCallbacks.onLoadMaterials(materials)
      if (Validator.isValid(prepDataCallbacks.onLoadMaterials))
        materials = prepDataCallbacks.onLoadMaterials(materials)
      return materials
    }

    var wrapperOnReportError = function(errorMessage) {
      var continueProcessing = true
      if (Validator.isValid(globalCallbacks.onReportError))
        continueProcessing = globalCallbacks.onReportError(supportDesc, errorMessage)
      if (Validator.isValid(prepDataCallbacks.onReportError))
        continueProcessing = prepDataCallbacks.onReportError(supportDesc, errorMessage)

      if (
        !Validator.isValid(globalCallbacks.onReportError) &&
        !Validator.isValid(prepDataCallbacks.onReportError)
      ) {
        console.error('Loader reported an error: ')
        console.error(errorMessage)
      }
      if (continueProcessing) {
        supportDesc.inUse = false
        scope.processQueue()
      }
    }

    supportDesc.loader = this._buildLoader(supportDesc.instanceNo)

    var updatedCallbacks = new THREE.LoaderSupport.Callbacks()
    updatedCallbacks.setCallbackOnLoad(wrapperOnLoad)
    updatedCallbacks.setCallbackOnProgress(wrapperOnProgress)
    updatedCallbacks.setCallbackOnReportError(wrapperOnReportError)
    updatedCallbacks.setCallbackOnMeshAlter(wrapperOnMeshAlter)
    updatedCallbacks.setCallbackOnLoadMaterials(wrapperOnLoadMaterials)
    prepData.callbacks = updatedCallbacks

    supportDesc.loader.run(prepData, supportDesc.workerSupport)
  }

  WorkerDirector.prototype._buildLoader = function(instanceNo) {
    var classDef = this.workerDescription.classDef
    var loader = Object.create(classDef.prototype)
    classDef.call(loader, THREE.DefaultLoadingManager)

    // verify that all required functions are implemented
    if (!loader.hasOwnProperty('instanceNo')) throw classDef.name + ' has no property "instanceNo".'
    loader.instanceNo = instanceNo

    if (!loader.hasOwnProperty('workerSupport')) {
      throw classDef.name + ' has no property "workerSupport".'
    }
    if (typeof loader.run !== 'function') throw classDef.name + ' has no function "run".'
    if (!loader.hasOwnProperty('callbacks') || !Validator.isValid(loader.callbacks)) {
      console.warn(
        classDef.name +
          ' has an invalid property "callbacks". Will change to "THREE.LoaderSupport.Callbacks"',
      )
      loader.callbacks = new THREE.LoaderSupport.Callbacks()
    }

    return loader
  }

  WorkerDirector.prototype._deregister = function(supportDesc) {
    if (Validator.isValid(supportDesc)) {
      supportDesc.workerSupport.setTerminateRequested(true)
      if (this.logging.enabled)
        console.info('Requested termination of worker #' + supportDesc.instanceNo + '.')

      var loaderCallbacks = supportDesc.loader.callbacks
      if (Validator.isValid(loaderCallbacks.onProgress))
        loaderCallbacks.onProgress({ detail: { text: '' } })
      delete this.workerDescription.workerSupports[supportDesc.instanceNo]
    }
  }

  /**
   * Terminate all workers.
   * @memberOf THREE.LoaderSupport.WorkerDirector
   *
   * @param {callback} callbackOnFinishedProcessing Function called once all workers finished processing.
   */
  WorkerDirector.prototype.tearDown = function(callbackOnFinishedProcessing) {
    if (this.logging.enabled)
      console.info('WorkerDirector received the deregister call. Terminating all workers!')

    this.instructionQueuePointer = this.instructionQueue.length
    this.callbackOnFinishedProcessing = Validator.verifyInput(callbackOnFinishedProcessing, null)

    for (var name in this.workerDescription.workerSupports) {
      this.workerDescription.workerSupports[name].terminateRequested = true
    }
  }

  return WorkerDirector
})()

/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

if (THREE.OBJLoader2 === undefined) {
  THREE.OBJLoader2 = {}
}

if (THREE.LoaderSupport === undefined)
  console.error(
    '"THREE.LoaderSupport" is not available. "THREE.OBJLoader2" requires it. Please include "LoaderSupport.js" in your HTML.',
  )

/**
 * Use this class to load OBJ data from files or to parse OBJ data from an arraybuffer
 * @class
 *
 * @param {THREE.DefaultLoadingManager} [manager] The loadingManager for the loader to use. Default is {@link THREE.DefaultLoadingManager}
 */
THREE.OBJLoader2 = (function() {
  var OBJLOADER2_VERSION = '2.4.2'
  var Validator = THREE.LoaderSupport.Validator

  function OBJLoader2(manager) {
    this.manager = Validator.verifyInput(manager, THREE.DefaultLoadingManager)
    this.logging = {
      enabled: true,
      debug: false,
    }

    this.modelName = ''
    this.instanceNo = 0
    this.path = ''
    this.useIndices = false
    this.disregardNormals = false
    this.materialPerSmoothingGroup = false
    this.useOAsMesh = false
    this.loaderRootNode = new THREE.Group()

    this.meshBuilder = new THREE.LoaderSupport.MeshBuilder()
    this.callbacks = new THREE.LoaderSupport.Callbacks()
    this.workerSupport = new THREE.LoaderSupport.WorkerSupport()
    this.terminateWorkerOnLoad = true
  }

  /**
   * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
   * @memberOf THREE.OBJLoader2
   *
   * @param {boolean} enabled True or false.
   * @param {boolean} debug True or false.
   */
  OBJLoader2.prototype.setLogging = function(enabled, debug) {
    this.logging.enabled = enabled === true
    this.logging.debug = debug === true
    this.meshBuilder.setLogging(this.logging.enabled, this.logging.debug)
  }

  /**
   * Set the name of the model.
   * @memberOf THREE.OBJLoader2
   *
   * @param {string} modelName
   */
  OBJLoader2.prototype.setModelName = function(modelName) {
    this.modelName = Validator.verifyInput(modelName, this.modelName)
  }

  /**
   * The URL of the base path.
   * @memberOf THREE.OBJLoader2
   *
   * @param {string} path URL
   */
  OBJLoader2.prototype.setPath = function(path) {
    this.path = Validator.verifyInput(path, this.path)
  }

  /**
   * Set the node where the loaded objects will be attached directly.
   * @memberOf THREE.OBJLoader2
   *
   * @param {THREE.Object3D} streamMeshesTo Object already attached to scenegraph where new meshes will be attached to
   */
  OBJLoader2.prototype.setStreamMeshesTo = function(streamMeshesTo) {
    this.loaderRootNode = Validator.verifyInput(streamMeshesTo, this.loaderRootNode)
  }

  /**
   * Set materials loaded by MTLLoader or any other supplier of an Array of {@link THREE.Material}.
   * @memberOf THREE.OBJLoader2
   *
   * @param {THREE.Material[]} materials Array of {@link THREE.Material}
   */
  OBJLoader2.prototype.setMaterials = function(materials) {
    this.meshBuilder.setMaterials(materials)
  }

  /**
   * Instructs loaders to create indexed {@link THREE.BufferGeometry}.
   * @memberOf THREE.OBJLoader2
   *
   * @param {boolean} useIndices=false
   */
  OBJLoader2.prototype.setUseIndices = function(useIndices) {
    this.useIndices = useIndices === true
  }

  /**
   * Tells whether normals should be completely disregarded and regenerated.
   * @memberOf THREE.OBJLoader2
   *
   * @param {boolean} disregardNormals=false
   */
  OBJLoader2.prototype.setDisregardNormals = function(disregardNormals) {
    this.disregardNormals = disregardNormals === true
  }

  /**
   * Tells whether a material shall be created per smoothing group.
   * @memberOf THREE.OBJLoader2
   *
   * @param {boolean} materialPerSmoothingGroup=false
   */
  OBJLoader2.prototype.setMaterialPerSmoothingGroup = function(materialPerSmoothingGroup) {
    this.materialPerSmoothingGroup = materialPerSmoothingGroup === true
  }

  /**
   * Usually 'o' is meta-information and does not result in creation of new meshes, but mesh creation on occurrence of "o" can be enforced.
   * @memberOf THREE.OBJLoader2
   *
   * @param {boolean} useOAsMesh=false
   */
  OBJLoader2.prototype.setUseOAsMesh = function(useOAsMesh) {
    this.useOAsMesh = useOAsMesh === true
  }

  OBJLoader2.prototype._setCallbacks = function(callbacks) {
    if (Validator.isValid(callbacks.onProgress))
      this.callbacks.setCallbackOnProgress(callbacks.onProgress)
    if (Validator.isValid(callbacks.onReportError))
      this.callbacks.setCallbackOnReportError(callbacks.onReportError)
    if (Validator.isValid(callbacks.onMeshAlter))
      this.callbacks.setCallbackOnMeshAlter(callbacks.onMeshAlter)
    if (Validator.isValid(callbacks.onLoad)) this.callbacks.setCallbackOnLoad(callbacks.onLoad)
    if (Validator.isValid(callbacks.onLoadMaterials))
      this.callbacks.setCallbackOnLoadMaterials(callbacks.onLoadMaterials)

    this.meshBuilder._setCallbacks(this.callbacks)
  }

  /**
   * Announce feedback which is give to the registered callbacks.
   * @memberOf THREE.OBJLoader2
   * @private
   *
   * @param {string} type The type of event
   * @param {string} text Textual description of the event
   * @param {number} numericalValue Numerical value describing the progress
   */
  OBJLoader2.prototype.onProgress = function(type, text, numericalValue) {
    var content = Validator.isValid(text) ? text : ''
    var event = {
      detail: {
        type: type,
        modelName: this.modelName,
        instanceNo: this.instanceNo,
        text: content,
        numericalValue: numericalValue,
      },
    }

    if (Validator.isValid(this.callbacks.onProgress)) this.callbacks.onProgress(event)

    if (this.logging.enabled && this.logging.debug) console.debug(content)
  }

  OBJLoader2.prototype._onError = function(event) {
    var output = 'Error occurred while downloading!'

    if (event.currentTarget && event.currentTarget.statusText !== null) {
      output +=
        '\nurl: ' + event.currentTarget.responseURL + '\nstatus: ' + event.currentTarget.statusText
    }
    this.onProgress('error', output, -1)
    this._throwError(output)
  }

  OBJLoader2.prototype._throwError = function(errorMessage) {
    if (Validator.isValid(this.callbacks.onReportError)) {
      this.callbacks.onReportError(errorMessage)
    } else {
      throw errorMessage
    }
  }

  /**
   * Use this convenient method to load a file at the given URL. By default the fileLoader uses an ArrayBuffer.
   * @memberOf THREE.OBJLoader2
   *
   * @param {string}  url A string containing the path/URL of the file to be loaded.
   * @param {callback} onLoad A function to be called after loading is successfully completed. The function receives loaded Object3D as an argument.
   * @param {callback} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
   * @param {callback} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
   * @param {callback} [onMeshAlter] A function to be called after a new mesh raw data becomes available for alteration.
   * @param {boolean} [useAsync] If true, uses async loading with worker, if false loads data synchronously.
   */
  OBJLoader2.prototype.load = function(url, onLoad, onProgress, onError, onMeshAlter, useAsync) {
    var resource = new THREE.LoaderSupport.ResourceDescriptor(url, 'OBJ')
    this._loadObj(resource, onLoad, onProgress, onError, onMeshAlter, useAsync)
  }

  OBJLoader2.prototype._loadObj = function(
    resource,
    onLoad,
    onProgress,
    onError,
    onMeshAlter,
    useAsync,
  ) {
    var scope = this
    if (!Validator.isValid(onError)) {
      onError = function(event) {
        scope._onError(event)
      }
    }

    // fast-fail
    if (!Validator.isValid(resource))
      onError('An invalid ResourceDescriptor was provided. Unable to continue!')
    var fileLoaderOnLoad = function(content) {
      resource.content = content
      if (useAsync) {
        scope.parseAsync(content, onLoad)
      } else {
        var callbacks = new THREE.LoaderSupport.Callbacks()
        callbacks.setCallbackOnMeshAlter(onMeshAlter)
        scope._setCallbacks(callbacks)
        onLoad({
          detail: {
            loaderRootNode: scope.parse(content),
            modelName: scope.modelName,
            instanceNo: scope.instanceNo,
          },
        })
      }
    }

    // fast-fail
    if (!Validator.isValid(resource.url) || Validator.isValid(resource.content)) {
      fileLoaderOnLoad(Validator.isValid(resource.content) ? resource.content : null)
    } else {
      if (!Validator.isValid(onProgress)) {
        var numericalValueRef = 0
        var numericalValue = 0
        onProgress = function(event) {
          if (!event.lengthComputable) return

          numericalValue = event.loaded / event.total
          if (numericalValue > numericalValueRef) {
            numericalValueRef = numericalValue
            var output =
              'Download of "' + resource.url + '": ' + (numericalValue * 100).toFixed(2) + '%'
            scope.onProgress('progressLoad', output, numericalValue)
          }
        }
      }

      var fileLoader = new THREE.FileLoader(this.manager)
      fileLoader.setPath(this.path)
      fileLoader.setResponseType('arraybuffer')
      fileLoader.load(resource.url, fileLoaderOnLoad, onProgress, onError)
    }
  }

  /**
   * Run the loader according the provided instructions.
   * @memberOf THREE.OBJLoader2
   *
   * @param {THREE.LoaderSupport.PrepData} prepData All parameters and resources required for execution
   * @param {THREE.LoaderSupport.WorkerSupport} [workerSupportExternal] Use pre-existing WorkerSupport
   */
  OBJLoader2.prototype.run = function(prepData, workerSupportExternal) {
    this._applyPrepData(prepData)
    var available = prepData.checkResourceDescriptorFiles(prepData.resources, [
      { ext: 'obj', type: 'ArrayBuffer', ignore: false },
      { ext: 'mtl', type: 'String', ignore: false },
      { ext: 'zip', type: 'String', ignore: true },
    ])
    if (Validator.isValid(workerSupportExternal)) {
      this.terminateWorkerOnLoad = false
      this.workerSupport = workerSupportExternal
      this.logging.enabled = this.workerSupport.logging.enabled
      this.logging.debug = this.workerSupport.logging.debug
    }
    var scope = this
    var onMaterialsLoaded = function(materials) {
      if (materials !== null) scope.meshBuilder.setMaterials(materials)
      scope._loadObj(
        available.obj,
        scope.callbacks.onLoad,
        null,
        null,
        scope.callbacks.onMeshAlter,
        prepData.useAsync,
      )
    }
    this._loadMtl(
      available.mtl,
      onMaterialsLoaded,
      null,
      null,
      prepData.crossOrigin,
      prepData.materialOptions,
    )
  }

  OBJLoader2.prototype._applyPrepData = function(prepData) {
    if (Validator.isValid(prepData)) {
      this.setLogging(prepData.logging.enabled, prepData.logging.debug)
      this.setModelName(prepData.modelName)
      this.setStreamMeshesTo(prepData.streamMeshesTo)
      this.meshBuilder.setMaterials(prepData.materials)
      this.setUseIndices(prepData.useIndices)
      this.setDisregardNormals(prepData.disregardNormals)
      this.setMaterialPerSmoothingGroup(prepData.materialPerSmoothingGroup)
      this.setUseOAsMesh(prepData.useOAsMesh)

      this._setCallbacks(prepData.getCallbacks())
    }
  }

  /**
   * Parses OBJ data synchronously from arraybuffer or string.
   * @memberOf THREE.OBJLoader2
   *
   * @param {arraybuffer|string} content OBJ data as Uint8Array or String
   */
  OBJLoader2.prototype.parse = function(content) {
    // fast-fail in case of illegal data
    if (!Validator.isValid(content)) {
      console.warn('Provided content is not a valid ArrayBuffer or String.')
      return this.loaderRootNode
    }
    if (this.logging.enabled) console.time('OBJLoader2 parse: ' + this.modelName)
    this.meshBuilder.init()

    var parser = new Parser()
    parser.setLogging(this.logging.enabled, this.logging.debug)
    parser.setMaterialPerSmoothingGroup(this.materialPerSmoothingGroup)
    parser.setUseOAsMesh(this.useOAsMesh)
    parser.setUseIndices(this.useIndices)
    parser.setDisregardNormals(this.disregardNormals)
    // sync code works directly on the material references
    parser.setMaterials(this.meshBuilder.getMaterials())

    var scope = this
    var onMeshLoaded = function(payload) {
      var meshes = scope.meshBuilder.processPayload(payload)
      var mesh
      for (var i in meshes) {
        mesh = meshes[i]
        scope.loaderRootNode.add(mesh)
      }
    }
    parser.setCallbackMeshBuilder(onMeshLoaded)
    var onProgressScoped = function(text, numericalValue) {
      scope.onProgress('progressParse', text, numericalValue)
    }
    parser.setCallbackProgress(onProgressScoped)

    if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
      if (this.logging.enabled) console.info('Parsing arrayBuffer...')
      parser.parse(content)
    } else if (typeof content === 'string' || content instanceof String) {
      if (this.logging.enabled) console.info('Parsing text...')
      parser.parseText(content)
    } else {
      this._throwError('Provided content was neither of type String nor Uint8Array! Aborting...')
    }
    if (this.logging.enabled) console.timeEnd('OBJLoader2 parse: ' + this.modelName)

    return this.loaderRootNode
  }

  /**
   * Parses OBJ content asynchronously from arraybuffer.
   * @memberOf THREE.OBJLoader2
   *
   * @param {arraybuffer} content OBJ data as Uint8Array
   * @param {callback} onLoad Called after worker successfully completed loading
   */
  OBJLoader2.prototype.parseAsync = function(content, onLoad) {
    var scope = this
    var measureTime = false
    var scopedOnLoad = function() {
      onLoad({
        detail: {
          loaderRootNode: scope.loaderRootNode,
          modelName: scope.modelName,
          instanceNo: scope.instanceNo,
        },
      })
      if (measureTime && scope.logging.enabled)
        console.timeEnd('OBJLoader2 parseAsync: ' + scope.modelName)
    }
    // fast-fail in case of illegal data
    if (!Validator.isValid(content)) {
      console.warn('Provided content is not a valid ArrayBuffer.')
      scopedOnLoad()
    } else {
      measureTime = true
    }
    if (measureTime && this.logging.enabled)
      console.time('OBJLoader2 parseAsync: ' + this.modelName)
    this.meshBuilder.init()

    var scopedOnMeshLoaded = function(payload) {
      var meshes = scope.meshBuilder.processPayload(payload)
      var mesh
      for (var i in meshes) {
        mesh = meshes[i]
        scope.loaderRootNode.add(mesh)
      }
    }
    var buildCode = function(funcBuildObject, funcBuildSingleton) {
      var workerCode = ''
      workerCode += '/**\n'
      workerCode += '  * This code was constructed by OBJLoader2 buildCode.\n'
      workerCode += '  */\n\n'
      workerCode += 'THREE = { LoaderSupport: {} };\n\n'
      workerCode += funcBuildObject('THREE.LoaderSupport.Validator', Validator)
      workerCode += funcBuildSingleton('Parser', Parser)

      return workerCode
    }
    this.workerSupport.validate(buildCode, 'Parser')
    this.workerSupport.setCallbacks(scopedOnMeshLoaded, scopedOnLoad)
    if (scope.terminateWorkerOnLoad) this.workerSupport.setTerminateRequested(true)

    var materialNames = {}
    var materials = this.meshBuilder.getMaterials()
    for (var materialName in materials) {
      materialNames[materialName] = materialName
    }
    this.workerSupport.run({
      params: {
        useAsync: true,
        materialPerSmoothingGroup: this.materialPerSmoothingGroup,
        useOAsMesh: this.useOAsMesh,
        useIndices: this.useIndices,
        disregardNormals: this.disregardNormals,
      },
      logging: {
        enabled: this.logging.enabled,
        debug: this.logging.debug,
      },
      materials: {
        // in async case only material names are supplied to parser
        materials: materialNames,
      },
      data: {
        input: content,
        options: null,
      },
    })
  }

  /**
   * Parse OBJ data either from ArrayBuffer or string
   * @class
   */
  var Parser = (function() {
    function Parser() {
      this.callbackProgress = null
      this.callbackMeshBuilder = null
      this.contentRef = null
      this.legacyMode = false

      this.materials = {}
      this.useAsync = false
      this.materialPerSmoothingGroup = false
      this.useOAsMesh = false
      this.useIndices = false
      this.disregardNormals = false

      this.vertices = []
      this.colors = []
      this.normals = []
      this.uvs = []

      this.rawMesh = {
        objectName: '',
        groupName: '',
        activeMtlName: '',
        mtllibName: '',

        // reset with new mesh
        faceType: -1,
        subGroups: [],
        subGroupInUse: null,
        smoothingGroup: {
          splitMaterials: false,
          normalized: -1,
          real: -1,
        },
        counts: {
          doubleIndicesCount: 0,
          faceCount: 0,
          mtlCount: 0,
          smoothingGroupCount: 0,
        },
      }

      this.inputObjectCount = 1
      this.outputObjectCount = 1
      this.globalCounts = {
        vertices: 0,
        faces: 0,
        doubleIndicesCount: 0,
        lineByte: 0,
        currentByte: 0,
        totalBytes: 0,
      }

      this.logging = {
        enabled: true,
        debug: false,
      }
    }

    Parser.prototype.resetRawMesh = function() {
      // faces are stored according combined index of group, material and smoothingGroup (0 or not)
      this.rawMesh.subGroups = []
      this.rawMesh.subGroupInUse = null
      this.rawMesh.smoothingGroup.normalized = -1
      this.rawMesh.smoothingGroup.real = -1

      // this default index is required as it is possible to define faces without 'g' or 'usemtl'
      this.pushSmoothingGroup(1)

      this.rawMesh.counts.doubleIndicesCount = 0
      this.rawMesh.counts.faceCount = 0
      this.rawMesh.counts.mtlCount = 0
      this.rawMesh.counts.smoothingGroupCount = 0
    }

    Parser.prototype.setUseAsync = function(useAsync) {
      this.useAsync = useAsync
    }

    Parser.prototype.setMaterialPerSmoothingGroup = function(materialPerSmoothingGroup) {
      this.materialPerSmoothingGroup = materialPerSmoothingGroup
    }

    Parser.prototype.setUseOAsMesh = function(useOAsMesh) {
      this.useOAsMesh = useOAsMesh
    }

    Parser.prototype.setUseIndices = function(useIndices) {
      this.useIndices = useIndices
    }

    Parser.prototype.setDisregardNormals = function(disregardNormals) {
      this.disregardNormals = disregardNormals
    }

    Parser.prototype.setMaterials = function(materials) {
      this.materials = THREE.LoaderSupport.Validator.verifyInput(materials, this.materials)
      this.materials = THREE.LoaderSupport.Validator.verifyInput(this.materials, {})
    }

    Parser.prototype.setCallbackMeshBuilder = function(callbackMeshBuilder) {
      if (!THREE.LoaderSupport.Validator.isValid(callbackMeshBuilder)) {
        this._throwError('Unable to run as no "MeshBuilder" callback is set.')
      }
      this.callbackMeshBuilder = callbackMeshBuilder
    }

    Parser.prototype.setCallbackProgress = function(callbackProgress) {
      this.callbackProgress = callbackProgress
    }

    Parser.prototype.setLogging = function(enabled, debug) {
      this.logging.enabled = enabled === true
      this.logging.debug = debug === true
    }

    Parser.prototype.configure = function() {
      this.pushSmoothingGroup(1)

      if (this.logging.enabled) {
        var matKeys = Object.keys(this.materials)
        var matNames =
          matKeys.length > 0
            ? '\n\tmaterialNames:\n\t\t- ' + matKeys.join('\n\t\t- ')
            : '\n\tmaterialNames: None'
        var printedConfig =
          'OBJLoader2.Parser configuration:' +
          matNames +
          '\n\tuseAsync: ' +
          this.useAsync +
          '\n\tmaterialPerSmoothingGroup: ' +
          this.materialPerSmoothingGroup +
          '\n\tuseOAsMesh: ' +
          this.useOAsMesh +
          '\n\tuseIndices: ' +
          this.useIndices +
          '\n\tdisregardNormals: ' +
          this.disregardNormals +
          '\n\tcallbackMeshBuilderName: ' +
          this.callbackMeshBuilder.name +
          '\n\tcallbackProgressName: ' +
          this.callbackProgress.name
        console.info(printedConfig)
      }
    }

    /**
     * Parse the provided arraybuffer
     * @memberOf Parser
     *
     * @param {Uint8Array} arrayBuffer OBJ data as Uint8Array
     */
    Parser.prototype.parse = function(arrayBuffer) {
      if (this.logging.enabled) console.time('OBJLoader2.Parser.parse')
      this.configure()

      var arrayBufferView = new Uint8Array(arrayBuffer)
      this.contentRef = arrayBufferView
      var length = arrayBufferView.byteLength
      this.globalCounts.totalBytes = length
      var buffer = new Array(128)

      for (var code, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i++) {
        code = arrayBufferView[i]
        switch (code) {
          // space
          case 32:
            if (word.length > 0) buffer[bufferPointer++] = word
            word = ''
            break
          // slash
          case 47:
            if (word.length > 0) buffer[bufferPointer++] = word
            slashesCount++
            word = ''
            break

          // LF
          case 10:
            if (word.length > 0) buffer[bufferPointer++] = word
            word = ''
            this.globalCounts.lineByte = this.globalCounts.currentByte
            this.globalCounts.currentByte = i
            this.processLine(buffer, bufferPointer, slashesCount)
            bufferPointer = 0
            slashesCount = 0
            break

          // CR
          case 13:
            break

          default:
            word += String.fromCharCode(code)
            break
        }
      }
      this.finalizeParsing()
      if (this.logging.enabled) console.timeEnd('OBJLoader2.Parser.parse')
    }

    /**
     * Parse the provided text
     * @memberOf Parser
     *
     * @param {string} text OBJ data as string
     */
    Parser.prototype.parseText = function(text) {
      if (this.logging.enabled) console.time('OBJLoader2.Parser.parseText')
      this.configure()
      this.legacyMode = true
      this.contentRef = text
      var length = text.length
      this.globalCounts.totalBytes = length
      var buffer = new Array(128)

      for (var char, word = '', bufferPointer = 0, slashesCount = 0, i = 0; i < length; i++) {
        char = text[i]
        switch (char) {
          case ' ':
            if (word.length > 0) buffer[bufferPointer++] = word
            word = ''
            break

          case '/':
            if (word.length > 0) buffer[bufferPointer++] = word
            slashesCount++
            word = ''
            break

          case '\n':
            if (word.length > 0) buffer[bufferPointer++] = word
            word = ''
            this.globalCounts.lineByte = this.globalCounts.currentByte
            this.globalCounts.currentByte = i
            this.processLine(buffer, bufferPointer, slashesCount)
            bufferPointer = 0
            slashesCount = 0
            break

          case '\r':
            break

          default:
            word += char
        }
      }
      this.finalizeParsing()
      if (this.logging.enabled) console.timeEnd('OBJLoader2.Parser.parseText')
    }

    Parser.prototype.processLine = function(buffer, bufferPointer, slashesCount) {
      if (bufferPointer < 1) return

      var reconstructString = function(content, legacyMode, start, stop) {
        var line = ''
        if (stop > start) {
          var i
          if (legacyMode) {
            for (i = start; i < stop; i++) line += content[i]
          } else {
            for (i = start; i < stop; i++) line += String.fromCharCode(content[i])
          }
          line = line.trim()
        }
        return line
      }

      var bufferLength, length, i, lineDesignation
      lineDesignation = buffer[0]
      switch (lineDesignation) {
        case 'v':
          this.vertices.push(parseFloat(buffer[1]))
          this.vertices.push(parseFloat(buffer[2]))
          this.vertices.push(parseFloat(buffer[3]))
          if (bufferPointer > 4) {
            this.colors.push(parseFloat(buffer[4]))
            this.colors.push(parseFloat(buffer[5]))
            this.colors.push(parseFloat(buffer[6]))
          }
          break

        case 'vt':
          this.uvs.push(parseFloat(buffer[1]))
          this.uvs.push(parseFloat(buffer[2]))
          break

        case 'vn':
          this.normals.push(parseFloat(buffer[1]))
          this.normals.push(parseFloat(buffer[2]))
          this.normals.push(parseFloat(buffer[3]))
          break

        case 'f':
          bufferLength = bufferPointer - 1

          // "f vertex ..."
          if (slashesCount === 0) {
            this.checkFaceType(0)
            for (i = 2, length = bufferLength; i < length; i++) {
              this.buildFace(buffer[1])
              this.buildFace(buffer[i])
              this.buildFace(buffer[i + 1])
            }

            // "f vertex/uv ..."
          } else if (bufferLength === slashesCount * 2) {
            this.checkFaceType(1)
            for (i = 3, length = bufferLength - 2; i < length; i += 2) {
              this.buildFace(buffer[1], buffer[2])
              this.buildFace(buffer[i], buffer[i + 1])
              this.buildFace(buffer[i + 2], buffer[i + 3])
            }

            // "f vertex/uv/normal ..."
          } else if (bufferLength * 2 === slashesCount * 3) {
            this.checkFaceType(2)
            for (i = 4, length = bufferLength - 3; i < length; i += 3) {
              this.buildFace(buffer[1], buffer[2], buffer[3])
              this.buildFace(buffer[i], buffer[i + 1], buffer[i + 2])
              this.buildFace(buffer[i + 3], buffer[i + 4], buffer[i + 5])
            }

            // "f vertex//normal ..."
          } else {
            this.checkFaceType(3)
            for (i = 3, length = bufferLength - 2; i < length; i += 2) {
              this.buildFace(buffer[1], undefined, buffer[2])
              this.buildFace(buffer[i], undefined, buffer[i + 1])
              this.buildFace(buffer[i + 2], undefined, buffer[i + 3])
            }
          }
          break

        case 'l':
        case 'p':
          bufferLength = bufferPointer - 1
          if (bufferLength === slashesCount * 2) {
            this.checkFaceType(4)
            for (i = 1, length = bufferLength + 1; i < length; i += 2)
              this.buildFace(buffer[i], buffer[i + 1])
          } else {
            this.checkFaceType(lineDesignation === 'l' ? 5 : 6)
            for (i = 1, length = bufferLength + 1; i < length; i++) this.buildFace(buffer[i])
          }
          break

        case 's':
          this.pushSmoothingGroup(buffer[1])
          break

        case 'g':
          // 'g' leads to creation of mesh if valid data (faces declaration was done before), otherwise only groupName gets set
          this.processCompletedMesh()
          this.rawMesh.groupName = reconstructString(
            this.contentRef,
            this.legacyMode,
            this.globalCounts.lineByte + 2,
            this.globalCounts.currentByte,
          )
          break

        case 'o':
          // 'o' is meta-information and usually does not result in creation of new meshes, but can be enforced with "useOAsMesh"
          if (this.useOAsMesh) this.processCompletedMesh()
          this.rawMesh.objectName = reconstructString(
            this.contentRef,
            this.legacyMode,
            this.globalCounts.lineByte + 2,
            this.globalCounts.currentByte,
          )
          break

        case 'mtllib':
          this.rawMesh.mtllibName = reconstructString(
            this.contentRef,
            this.legacyMode,
            this.globalCounts.lineByte + 7,
            this.globalCounts.currentByte,
          )
          break

        case 'usemtl':
          var mtlName = reconstructString(
            this.contentRef,
            this.legacyMode,
            this.globalCounts.lineByte + 7,
            this.globalCounts.currentByte,
          )
          if (mtlName !== '' && this.rawMesh.activeMtlName !== mtlName) {
            this.rawMesh.activeMtlName = mtlName
            this.rawMesh.counts.mtlCount++
            this.checkSubGroup()
          }
          break

        default:
          break
      }
    }

    Parser.prototype.pushSmoothingGroup = function(smoothingGroup) {
      var smoothingGroupInt = parseInt(smoothingGroup)
      if (isNaN(smoothingGroupInt)) {
        smoothingGroupInt = smoothingGroup === 'off' ? 0 : 1
      }

      var smoothCheck = this.rawMesh.smoothingGroup.normalized
      this.rawMesh.smoothingGroup.normalized = this.rawMesh.smoothingGroup.splitMaterials
        ? smoothingGroupInt
        : smoothingGroupInt === 0
          ? 0
          : 1
      this.rawMesh.smoothingGroup.real = smoothingGroupInt

      if (smoothCheck !== smoothingGroupInt) {
        this.rawMesh.counts.smoothingGroupCount++
        this.checkSubGroup()
      }
    }

    /**
     * Expanded faceTypes include all four face types, both line types and the point type
     * faceType = 0: "f vertex ..."
     * faceType = 1: "f vertex/uv ..."
     * faceType = 2: "f vertex/uv/normal ..."
     * faceType = 3: "f vertex//normal ..."
     * faceType = 4: "l vertex/uv ..." or "l vertex ..."
     * faceType = 5: "l vertex ..."
     * faceType = 6: "p vertex ..."
     */
    Parser.prototype.checkFaceType = function(faceType) {
      if (this.rawMesh.faceType !== faceType) {
        this.processCompletedMesh()
        this.rawMesh.faceType = faceType
        this.checkSubGroup()
      }
    }

    Parser.prototype.checkSubGroup = function() {
      var index = this.rawMesh.activeMtlName + '|' + this.rawMesh.smoothingGroup.normalized
      this.rawMesh.subGroupInUse = this.rawMesh.subGroups[index]

      if (!THREE.LoaderSupport.Validator.isValid(this.rawMesh.subGroupInUse)) {
        this.rawMesh.subGroupInUse = {
          index: index,
          objectName: this.rawMesh.objectName,
          groupName: this.rawMesh.groupName,
          materialName: this.rawMesh.activeMtlName,
          smoothingGroup: this.rawMesh.smoothingGroup.normalized,
          vertices: [],
          indexMappingsCount: 0,
          indexMappings: [],
          indices: [],
          colors: [],
          uvs: [],
          normals: [],
        }
        this.rawMesh.subGroups[index] = this.rawMesh.subGroupInUse
      }
    }

    Parser.prototype.buildFace = function(faceIndexV, faceIndexU, faceIndexN) {
      if (this.disregardNormals) faceIndexN = undefined
      var scope = this
      var updateSubGroupInUse = function() {
        var faceIndexVi = parseInt(faceIndexV)
        var indexPointerV =
          3 * (faceIndexVi > 0 ? faceIndexVi - 1 : faceIndexVi + scope.vertices.length / 3)

        var vertices = scope.rawMesh.subGroupInUse.vertices
        vertices.push(scope.vertices[indexPointerV++])
        vertices.push(scope.vertices[indexPointerV++])
        vertices.push(scope.vertices[indexPointerV])

        var indexPointerC = scope.colors.length > 0 ? indexPointerV + 1 : null
        if (indexPointerC !== null) {
          var colors = scope.rawMesh.subGroupInUse.colors
          colors.push(scope.colors[indexPointerC++])
          colors.push(scope.colors[indexPointerC++])
          colors.push(scope.colors[indexPointerC])
        }
        if (faceIndexU) {
          var faceIndexUi = parseInt(faceIndexU)
          var indexPointerU =
            2 * (faceIndexUi > 0 ? faceIndexUi - 1 : faceIndexUi + scope.uvs.length / 2)
          var uvs = scope.rawMesh.subGroupInUse.uvs
          uvs.push(scope.uvs[indexPointerU++])
          uvs.push(scope.uvs[indexPointerU])
        }
        if (faceIndexN) {
          var faceIndexNi = parseInt(faceIndexN)
          var indexPointerN =
            3 * (faceIndexNi > 0 ? faceIndexNi - 1 : faceIndexNi + scope.normals.length / 3)
          var normals = scope.rawMesh.subGroupInUse.normals
          normals.push(scope.normals[indexPointerN++])
          normals.push(scope.normals[indexPointerN++])
          normals.push(scope.normals[indexPointerN])
        }
      }

      if (this.useIndices) {
        var mappingName =
          faceIndexV +
          (faceIndexU ? '_' + faceIndexU : '_n') +
          (faceIndexN ? '_' + faceIndexN : '_n')
        var indicesPointer = this.rawMesh.subGroupInUse.indexMappings[mappingName]
        if (THREE.LoaderSupport.Validator.isValid(indicesPointer)) {
          this.rawMesh.counts.doubleIndicesCount++
        } else {
          indicesPointer = this.rawMesh.subGroupInUse.vertices.length / 3
          updateSubGroupInUse()
          this.rawMesh.subGroupInUse.indexMappings[mappingName] = indicesPointer
          this.rawMesh.subGroupInUse.indexMappingsCount++
        }
        this.rawMesh.subGroupInUse.indices.push(indicesPointer)
      } else {
        updateSubGroupInUse()
      }
      this.rawMesh.counts.faceCount++
    }

    Parser.prototype.createRawMeshReport = function(inputObjectCount) {
      return (
        'Input Object number: ' +
        inputObjectCount +
        '\n\tObject name: ' +
        this.rawMesh.objectName +
        '\n\tGroup name: ' +
        this.rawMesh.groupName +
        '\n\tMtllib name: ' +
        this.rawMesh.mtllibName +
        '\n\tVertex count: ' +
        this.vertices.length / 3 +
        '\n\tNormal count: ' +
        this.normals.length / 3 +
        '\n\tUV count: ' +
        this.uvs.length / 2 +
        '\n\tSmoothingGroup count: ' +
        this.rawMesh.counts.smoothingGroupCount +
        '\n\tMaterial count: ' +
        this.rawMesh.counts.mtlCount +
        '\n\tReal MeshOutputGroup count: ' +
        this.rawMesh.subGroups.length
      )
    }

    /**
     * Clear any empty subGroup and calculate absolute vertex, normal and uv counts
     */
    Parser.prototype.finalizeRawMesh = function() {
      var meshOutputGroupTemp = []
      var meshOutputGroup
      var absoluteVertexCount = 0
      var absoluteIndexMappingsCount = 0
      var absoluteIndexCount = 0
      var absoluteColorCount = 0
      var absoluteNormalCount = 0
      var absoluteUvCount = 0
      var indices
      for (var name in this.rawMesh.subGroups) {
        meshOutputGroup = this.rawMesh.subGroups[name]
        if (meshOutputGroup.vertices.length > 0) {
          indices = meshOutputGroup.indices
          if (indices.length > 0 && absoluteIndexMappingsCount > 0) {
            for (var i in indices) indices[i] = indices[i] + absoluteIndexMappingsCount
          }
          meshOutputGroupTemp.push(meshOutputGroup)
          absoluteVertexCount += meshOutputGroup.vertices.length
          absoluteIndexMappingsCount += meshOutputGroup.indexMappingsCount
          absoluteIndexCount += meshOutputGroup.indices.length
          absoluteColorCount += meshOutputGroup.colors.length
          absoluteUvCount += meshOutputGroup.uvs.length
          absoluteNormalCount += meshOutputGroup.normals.length
        }
      }

      // do not continue if no result
      var result = null
      if (meshOutputGroupTemp.length > 0) {
        result = {
          name: this.rawMesh.groupName !== '' ? this.rawMesh.groupName : this.rawMesh.objectName,
          subGroups: meshOutputGroupTemp,
          absoluteVertexCount: absoluteVertexCount,
          absoluteIndexCount: absoluteIndexCount,
          absoluteColorCount: absoluteColorCount,
          absoluteNormalCount: absoluteNormalCount,
          absoluteUvCount: absoluteUvCount,
          faceCount: this.rawMesh.counts.faceCount,
          doubleIndicesCount: this.rawMesh.counts.doubleIndicesCount,
        }
      }
      return result
    }

    Parser.prototype.processCompletedMesh = function() {
      var result = this.finalizeRawMesh()
      if (THREE.LoaderSupport.Validator.isValid(result)) {
        if (this.colors.length > 0 && this.colors.length !== this.vertices.length) {
          this._throwError(
            'Vertex Colors were detected, but vertex count and color count do not match!',
          )
        }
        if (this.logging.enabled && this.logging.debug)
          console.debug(this.createRawMeshReport(this.inputObjectCount))
        this.inputObjectCount++

        this.buildMesh(result)
        var progressBytesPercent = this.globalCounts.currentByte / this.globalCounts.totalBytes
        this.callbackProgress(
          'Completed [o: ' +
            this.rawMesh.objectName +
            ' g:' +
            this.rawMesh.groupName +
            '] Total progress: ' +
            (progressBytesPercent * 100).toFixed(2) +
            '%',
          progressBytesPercent,
        )
        this.resetRawMesh()
        return true
      } else {
        return false
      }
    }

    /**
     * SubGroups are transformed to too intermediate format that is forwarded to the MeshBuilder.
     * It is ensured that SubGroups only contain objects with vertices (no need to check).
     *
     * @param result
     */
    Parser.prototype.buildMesh = function(result) {
      var meshOutputGroups = result.subGroups

      var vertexFA = new Float32Array(result.absoluteVertexCount)
      this.globalCounts.vertices += result.absoluteVertexCount / 3
      this.globalCounts.faces += result.faceCount
      this.globalCounts.doubleIndicesCount += result.doubleIndicesCount
      var indexUA =
        result.absoluteIndexCount > 0 ? new Uint32Array(result.absoluteIndexCount) : null
      var colorFA =
        result.absoluteColorCount > 0 ? new Float32Array(result.absoluteColorCount) : null
      var normalFA =
        result.absoluteNormalCount > 0 ? new Float32Array(result.absoluteNormalCount) : null
      var uvFA = result.absoluteUvCount > 0 ? new Float32Array(result.absoluteUvCount) : null
      var haveVertexColors = THREE.LoaderSupport.Validator.isValid(colorFA)

      var meshOutputGroup
      var materialNames = []

      var createMultiMaterial = meshOutputGroups.length > 1
      var materialIndex = 0
      var materialIndexMapping = []
      var selectedMaterialIndex
      var materialGroup
      var materialGroups = []

      var vertexFAOffset = 0
      var indexUAOffset = 0
      var colorFAOffset = 0
      var normalFAOffset = 0
      var uvFAOffset = 0
      var materialGroupOffset = 0
      var materialGroupLength = 0

      var materialOrg, material, materialName, materialNameOrg
      // only one specific face type
      for (var oodIndex in meshOutputGroups) {
        if (!meshOutputGroups.hasOwnProperty(oodIndex)) continue
        meshOutputGroup = meshOutputGroups[oodIndex]

        materialNameOrg = meshOutputGroup.materialName
        if (this.rawMesh.faceType < 4) {
          materialName =
            materialNameOrg +
            (haveVertexColors ? '_vertexColor' : '') +
            (meshOutputGroup.smoothingGroup === 0 ? '_flat' : '')
        } else {
          materialName =
            this.rawMesh.faceType === 6 ? 'defaultPointMaterial' : 'defaultLineMaterial'
        }
        materialOrg = this.materials[materialNameOrg]
        material = this.materials[materialName]

        // both original and derived names do not lead to an existing material => need to use a default material
        if (
          !THREE.LoaderSupport.Validator.isValid(materialOrg) &&
          !THREE.LoaderSupport.Validator.isValid(material)
        ) {
          var defaultMaterialName = haveVertexColors
            ? 'defaultVertexColorMaterial'
            : 'defaultMaterial'
          materialOrg = this.materials[defaultMaterialName]
          if (this.logging.enabled)
            console.warn(
              'object_group "' +
                meshOutputGroup.objectName +
                '_' +
                meshOutputGroup.groupName +
                '" was defined with unresolvable material "' +
                materialNameOrg +
                '"! Assigning "' +
                defaultMaterialName +
                '".',
            )
          materialNameOrg = defaultMaterialName

          // if names are identical then there is no need for later manipulation
          if (materialNameOrg === materialName) {
            material = materialOrg
            materialName = defaultMaterialName
          }
        }
        if (!THREE.LoaderSupport.Validator.isValid(material)) {
          var materialCloneInstructions = {
            materialNameOrg: materialNameOrg,
            materialName: materialName,
            materialProperties: {
              vertexColors: haveVertexColors ? 2 : 0,
              flatShading: meshOutputGroup.smoothingGroup === 0,
            },
          }
          var payload = {
            cmd: 'materialData',
            materials: {
              materialCloneInstructions: materialCloneInstructions,
            },
          }
          this.callbackMeshBuilder(payload)

          // fake entry for async; sync Parser always works on material references (Builder update directly visible here)
          if (this.useAsync) this.materials[materialName] = materialCloneInstructions
        }

        if (createMultiMaterial) {
          // re-use material if already used before. Reduces materials array size and eliminates duplicates
          selectedMaterialIndex = materialIndexMapping[materialName]
          if (!selectedMaterialIndex) {
            selectedMaterialIndex = materialIndex
            materialIndexMapping[materialName] = materialIndex
            materialNames.push(materialName)
            materialIndex++
          }
          materialGroupLength = this.useIndices
            ? meshOutputGroup.indices.length
            : meshOutputGroup.vertices.length / 3
          materialGroup = {
            start: materialGroupOffset,
            count: materialGroupLength,
            index: selectedMaterialIndex,
          }
          materialGroups.push(materialGroup)
          materialGroupOffset += materialGroupLength
        } else {
          materialNames.push(materialName)
        }

        vertexFA.set(meshOutputGroup.vertices, vertexFAOffset)
        vertexFAOffset += meshOutputGroup.vertices.length

        if (indexUA) {
          indexUA.set(meshOutputGroup.indices, indexUAOffset)
          indexUAOffset += meshOutputGroup.indices.length
        }

        if (colorFA) {
          colorFA.set(meshOutputGroup.colors, colorFAOffset)
          colorFAOffset += meshOutputGroup.colors.length
        }

        if (normalFA) {
          normalFA.set(meshOutputGroup.normals, normalFAOffset)
          normalFAOffset += meshOutputGroup.normals.length
        }
        if (uvFA) {
          uvFA.set(meshOutputGroup.uvs, uvFAOffset)
          uvFAOffset += meshOutputGroup.uvs.length
        }

        if (this.logging.enabled && this.logging.debug) {
          var materialIndexLine = THREE.LoaderSupport.Validator.isValid(selectedMaterialIndex)
            ? '\n\t\tmaterialIndex: ' + selectedMaterialIndex
            : ''
          var createdReport =
            '\tOutput Object no.: ' +
            this.outputObjectCount +
            '\n\t\tgroupName: ' +
            meshOutputGroup.groupName +
            '\n\t\tIndex: ' +
            meshOutputGroup.index +
            '\n\t\tfaceType: ' +
            this.rawMesh.faceType +
            '\n\t\tmaterialName: ' +
            meshOutputGroup.materialName +
            '\n\t\tsmoothingGroup: ' +
            meshOutputGroup.smoothingGroup +
            materialIndexLine +
            '\n\t\tobjectName: ' +
            meshOutputGroup.objectName +
            '\n\t\t#vertices: ' +
            meshOutputGroup.vertices.length / 3 +
            '\n\t\t#indices: ' +
            meshOutputGroup.indices.length +
            '\n\t\t#colors: ' +
            meshOutputGroup.colors.length / 3 +
            '\n\t\t#uvs: ' +
            meshOutputGroup.uvs.length / 2 +
            '\n\t\t#normals: ' +
            meshOutputGroup.normals.length / 3
          console.debug(createdReport)
        }
      }

      this.outputObjectCount++
      this.callbackMeshBuilder(
        {
          cmd: 'meshData',
          progress: {
            numericalValue: this.globalCounts.currentByte / this.globalCounts.totalBytes,
          },
          params: {
            meshName: result.name,
          },
          materials: {
            multiMaterial: createMultiMaterial,
            materialNames: materialNames,
            materialGroups: materialGroups,
          },
          buffers: {
            vertices: vertexFA,
            indices: indexUA,
            colors: colorFA,
            normals: normalFA,
            uvs: uvFA,
          },
          // 0: mesh, 1: line, 2: point
          geometryType: this.rawMesh.faceType < 4 ? 0 : this.rawMesh.faceType === 6 ? 2 : 1,
        },
        [vertexFA.buffer],
        THREE.LoaderSupport.Validator.isValid(indexUA) ? [indexUA.buffer] : null,
        THREE.LoaderSupport.Validator.isValid(colorFA) ? [colorFA.buffer] : null,
        THREE.LoaderSupport.Validator.isValid(normalFA) ? [normalFA.buffer] : null,
        THREE.LoaderSupport.Validator.isValid(uvFA) ? [uvFA.buffer] : null,
      )
    }

    Parser.prototype.finalizeParsing = function() {
      if (this.logging.enabled)
        console.info('Global output object count: ' + this.outputObjectCount)
      if (this.processCompletedMesh() && this.logging.enabled) {
        var parserFinalReport =
          'Overall counts: ' +
          '\n\tVertices: ' +
          this.globalCounts.vertices +
          '\n\tFaces: ' +
          this.globalCounts.faces +
          '\n\tMultiple definitions: ' +
          this.globalCounts.doubleIndicesCount
        console.info(parserFinalReport)
      }
    }

    return Parser
  })()

  /**
   * Utility method for loading an mtl file according resource description. Provide url or content.
   * @memberOf THREE.OBJLoader2
   *
   * @param {string} url URL to the file
   * @param {Object} content The file content as arraybuffer or text
   * @param {function} onLoad Callback to be called after successful load
   * @param {callback} [onProgress] A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, which contains total and Integer bytes.
   * @param {callback} [onError] A function to be called if an error occurs during loading. The function receives the error as an argument.
   * @param {string} [crossOrigin] CORS value
   * @param {Object} [materialOptions] Set material loading options for MTLLoader
   */
  OBJLoader2.prototype.loadMtl = function(
    url,
    content,
    onLoad,
    onProgress,
    onError,
    crossOrigin,
    materialOptions,
  ) {
    var resource = new THREE.LoaderSupport.ResourceDescriptor(url, 'MTL')
    resource.setContent(content)
    this._loadMtl(resource, onLoad, onProgress, onError, crossOrigin, materialOptions)
  }

  OBJLoader2.prototype._loadMtl = function(
    resource,
    onLoad,
    onProgress,
    onError,
    crossOrigin,
    materialOptions,
  ) {
    if (THREE.MTLLoader === undefined)
      console.error(
        '"THREE.MTLLoader" is not available. "THREE.OBJLoader2" requires it for loading MTL files.',
      )
    if (Validator.isValid(resource) && this.logging.enabled)
      console.time('Loading MTL: ' + resource.name)

    var materials = []
    var scope = this
    var processMaterials = function(materialCreator) {
      var materialCreatorMaterials = []
      if (Validator.isValid(materialCreator)) {
        materialCreator.preload()
        materialCreatorMaterials = materialCreator.materials
        for (var materialName in materialCreatorMaterials) {
          if (materialCreatorMaterials.hasOwnProperty(materialName)) {
            materials[materialName] = materialCreatorMaterials[materialName]
          }
        }
      }

      if (Validator.isValid(resource) && scope.logging.enabled)
        console.timeEnd('Loading MTL: ' + resource.name)
      onLoad(materials, materialCreator)
    }

    // fast-fail
    if (
      !Validator.isValid(resource) ||
      (!Validator.isValid(resource.content) && !Validator.isValid(resource.url))
    ) {
      processMaterials()
    } else {
      var mtlLoader = new THREE.MTLLoader(this.manager)
      crossOrigin = Validator.verifyInput(crossOrigin, 'anonymous')
      mtlLoader.setCrossOrigin(crossOrigin)
      mtlLoader.setPath(resource.path)
      if (Validator.isValid(materialOptions)) mtlLoader.setMaterialOptions(materialOptions)

      var parseTextWithMtlLoader = function(content) {
        var contentAsText = content
        if (typeof content !== 'string' && !(content instanceof String)) {
          if (content.length > 0 || content.byteLength > 0) {
            contentAsText = THREE.LoaderUtils.decodeText(content)
          } else {
            this._throwError(
              'Unable to parse mtl as it it seems to be neither a String, an Array or an ArrayBuffer!',
            )
          }
        }
        processMaterials(mtlLoader.parse(contentAsText))
      }

      if (Validator.isValid(resource.content)) {
        parseTextWithMtlLoader(resource.content)
      } else if (Validator.isValid(resource.url)) {
        var fileLoader = new THREE.FileLoader(this.manager)
        if (!Validator.isValid(onError)) {
          onError = function(event) {
            scope._onError(event)
          }
        }
        if (!Validator.isValid(onProgress)) {
          var numericalValueRef = 0
          var numericalValue = 0
          onProgress = function(event) {
            if (!event.lengthComputable) return

            numericalValue = event.loaded / event.total
            if (numericalValue > numericalValueRef) {
              numericalValueRef = numericalValue
              var output =
                'Download of "' + resource.url + '": ' + (numericalValue * 100).toFixed(2) + '%'
              scope.onProgress('progressLoad', output, numericalValue)
            }
          }
        }

        fileLoader.load(resource.url, parseTextWithMtlLoader, onProgress, onError)
      }
    }
  }

  return OBJLoader2
})()

export const OBJLoader2 = THREE.OBJLoader2
