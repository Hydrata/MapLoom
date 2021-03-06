var SERVER_SERVICE_USE_PORT = false;
var SERVER_SERVICE_USE_PROXY = true;

(function() {
  var module = angular.module('loom_server_service', []);

  // Private Variables
  var servers = [];

  var rootScope_ = null;
  var service_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var http_ = null;
  var location_ = null;
  var configService_ = null;
  var q_ = null;
  var serverCount = 0;

  module.provider('serverService', function() {
    this.$get = function($rootScope, $http, $q, $location, $translate, dialogService, configService) {
      service_ = this;
      rootScope_ = $rootScope;
      dialogService_ = dialogService;
      translate_ = $translate;
      http_ = $http;
      location_ = $location;
      configService_ = configService;
      configService_.serverList = servers;
      q_ = $q;
      return this;
    };

    this.getCatalogList = function(callback) {
      http_.get(configService_.configuration.searchApiURL).then(function(data) {
        if (data) {
          return callback(data);
        }
      });
    };

    this.getServers = function() {
      return servers;
    };

    this.getServerById = function(id) {
      var server = null;
      if (!goog.isDefAndNotNull(id)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server id.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          server = servers[index];
          break;
        }
      }

      return server;
    };

    this.getServerIndex = function(id) {

      if (!goog.isDefAndNotNull(id)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server id.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          return index;
        }
      }

      return -1;
    };

    this.getServerByPtype = function(ptype) {
      var server = null;

      if (!goog.isDefAndNotNull(ptype)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server ptype.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].ptype === ptype) {
          server = servers[index];
          break;
        }
      }

      return server;
    };

    this.getServerByUrl = function(url) {
      var server = null;

      if (!goog.isDefAndNotNull(url)) {
        return server;
      }

      if (url.indexOf('/wms') === -1) {
        url += '/wms';
      }

      for (var index = 0; index < servers.length; index += 1) {
        var serverUrl = goog.isDefAndNotNull(servers[index].virtualServiceUrl) ? servers[index].virtualServiceUrl : servers[index].url;
        if (serverUrl === url) {
          server = servers[index];
          break;
        }
      }

      //console.log('----[ returning server with name: ', name, ', server: ', server);
      return server;
    };

    this.getServerByUrl = function(url) {
      var server = null;

      if (!goog.isDefAndNotNull(url)) {
        return server;
      }

      if (url.indexOf('/wms') === -1) {
        url += '/wms';
      }

      for (var index = 0; index < servers.length; index += 1) {
        var serverUrl = goog.isDefAndNotNull(servers[index].virtualServiceUrl) ? servers[index].virtualServiceUrl : servers[index].url;
        if (serverUrl === url) {
          server = servers[index];
          break;
        }
      }

      //console.log('----[ returning server with name: ', name, ', server: ', server);
      return server;
    };

    this.getServerByName = function(name) {
      var server = null;

      if (!goog.isDefAndNotNull(name)) {
        throw ({
          name: 'serverService',
          level: 'High',
          message: 'undefined server name.',
          toString: function() {
            return this.name + ': ' + this.message;
          }
        });
      }

      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].name.toLocaleLowerCase() === name.toLowerCase()) {
          server = servers[index];
          break;
        }
      }
      return server;
    };

    this.getRegistryLayerConfig = function() {
      return configService_.configuration.elasticLayerConfig;
    };

    this.isUrlAVirtualService = function(url) {

      if (!goog.isDefAndNotNull(url)) {
        return false;
      }

      var urlSections = url.split('/');

      var counter = 0;
      var lastNotEmptyToken = null;
      for (var i = 0; i < urlSections.length; i++) {
        if (urlSections[i].length > 0) {
          counter++;
          lastNotEmptyToken = urlSections[i];
        }
      }

      return counter > 4 && lastNotEmptyToken.toLowerCase() === 'wms';
    };

    this.replaceVirtualServiceUrl = function(serverInfo) {
      if (!goog.isDefAndNotNull(serverInfo.url)) {
        return null;
      }

      if (service_.isUrlAVirtualService(serverInfo.url) === true) {
        var urlSections = serverInfo.url.split('/');
        var newUrl = urlSections[0] + '//' + urlSections[2] + '/' + urlSections[3] + '/' + urlSections[6];
        serverInfo.isVirtualService = true;
        serverInfo.virtualServiceUrl = serverInfo.url;
        serverInfo.url = newUrl;
      } else {
        serverInfo.isVirtualService = false;
      }

      return serverInfo;
    };

    this.getWfsRequestUrl = function(url) {
      var wfsurl = null;
      var server = service_.getServerByUrl(url);
      url = goog.isDefAndNotNull(server) ? service_.getMostSpecificUrl(server) : url;
      var currentDomain = locationService_.host();
      if (goog.isDefAndNotNull(url)) {
        if (url.indexOf(currentDomain) > -1) {
          wfsurl = location.protocol + '//' + location.host + '/wfsproxy/';
          return wfsurl;
        }
      }
      wfsurl = url + '/wfs/WfsDispatcher';
      return wfsurl;
    };

    this.getWfsRequestHeaders = function(server) {

      var headers = {};

      if (!goog.isDefAndNotNull(server)) {
        return headers;
      }

      var currentDomain = locationService_.host();
      var serverUrl = service_.getMostSpecificUrl(server);
      headers['Content-Type'] = 'application/xml';
      if (goog.isDefAndNotNull(server.authentication)) {
        headers['Authorization'] = 'Basic ' + server.authentication;
      }

      if (serverUrl.indexOf(currentDomain) > -1) {
        headers['X-CSRFToken'] = configService_.csrfToken;
      }

      return headers;
    };

    this.getMostSpecificUrl = function(server) {

      // favor virtual service url when available
      var mostSpecificUrl = server.url;
      var mostSpecificUrlWms;
      if (goog.isDefAndNotNull(server.isVirtualService) && server.isVirtualService === true) {
        mostSpecificUrlWms = server.virtualServiceUrl;
      }
      if (goog.isDefAndNotNull(mostSpecificUrlWms)) {
        var urlIndex = mostSpecificUrlWms.lastIndexOf('/');
        if (urlIndex !== -1) {
          mostSpecificUrl = mostSpecificUrlWms.slice(0, urlIndex);
        }
      }

      return mostSpecificUrl;
    };

    this.changeCredentials = function(server) {
      var deferredResponse = q_.defer();
      var doWork = function() {
        service_.populateLayersConfig(server, true)
            .then(function(response) {
              deferredResponse.resolve(server);
            }, function(reject) {
              deferredResponse.reject(server, reject);
            });
      };

      if (goog.isDefAndNotNull(server.url)) {
        if (server.url.indexOf(location_.host()) === -1) {
          dialogService_.promptCredentials(server.url, true, null, server.config.alwaysAnonymous).then(
              function(credentials) {
                server.username = credentials.username;
                server.authentication = $.base64.encode(credentials.username + ':' + credentials.password);
                server.config.alwaysAnonymous = false;

                // remove the 'wms endpoint'
                var serverBaseUrl = urlRemoveLastRoute(server.url);
                var serverAuthenticationUrl = serverBaseUrl + '/rest/settings.json';
                serverAuthenticationUrl = serverAuthenticationUrl.replace('http://', 'http://null:null@');
                ignoreNextScriptError = true;
                $.ajax({
                  url: serverAuthenticationUrl,
                  type: 'GET',
                  dataType: 'jsonp',
                  jsonp: 'callback',
                  error: function() {
                    ignoreNextScriptError = false;
                  },
                  complete: doWork
                });
              }, function(reject) {
                if (goog.isDefAndNotNull(reject) && reject.anonymous) {
                  server.username = translate_.instant('anonymous');
                  server.config.alwaysAnonymous = reject.alwaysAnonymous;
                  server.authentication = undefined;
                  doWork();
                }
              });
        } else {
          server.username = configService_.username;
          server.isLocal = true;
          doWork();
        }
      } else {
        doWork();
      }
      return deferredResponse.promise;
    };

    this.addServer = function(serverInfo, loaded) {
      var deferredResponse = q_.defer();
      // save the config object on the server object so that when we save the server, we only pass the config as opposed
      // to anything else that the app ads to the server objects.
      var server = {
        id: null,
        ptype: 'gxp_olsource',
        config: serverInfo,
        populatingLayersConfig: false,
        isVirtualService: false, //Used to filter getCapabilities requests to specific resources

        // Servers that have too many layers will cause an issue when a getCapabilities request is made when the map
        // is initially created.  This attribute will prevent MapLoom from running logic (ie a getCapabilties request)
        // until the user specifically tells MapLoom to make the request.  The user tells MapLoom to run the logic
        // from the 'Add Layers' dialog.
        lazy: false
      };

      goog.object.extend(server, serverInfo, {});

      if (goog.isDefAndNotNull(loaded)) {
        loaded = false;
      }

      if (server.ptype === 'gxp_olsource') {
        deferredResponse.resolve();
        return deferredResponse.promise;
      }

      var doWork = function() {
        service_.populateLayersConfig(server)
            .then(function(response) {
              // set the id. it should always resolve to the length
              if (goog.isDefAndNotNull(server.layersConfig) && server.layersConfig.length === 0 && !loaded &&
                  server.lazy !== true) {
                dialogService_.warn(translate_.instant('add_server'), translate_.instant('server_connect_failed'),
                    [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      server.id = serverCount++;
                      servers.push(server);
                      rootScope_.$broadcast('server-added', server.id);
                      deferredResponse.resolve(server);
                      break;
                    case 1:
                      deferredResponse.reject(server);
                      break;
                  }
                });
              } else {
                // If there are no layers on the server, layersConfig will be undefined.
                if (!goog.isDefAndNotNull(server.layersConfig)) {
                  server.layersConfig = [];
                }
                server.id = serverCount++;
                servers.push(server);
                rootScope_.$broadcast('server-added', server.id);
                deferredResponse.resolve(server);
              }
            }, function(reject) {
              deferredResponse.reject(reject);
            });
      };

      if (goog.isDefAndNotNull(server.url)) {
        if (server.url.indexOf(location_.host()) === -1) {
          if (server.config.alwaysAnonymous) {
            server.username = translate_.instant('anonymous');
            server.authentication = undefined;
            doWork();
          } else {
            dialogService_.promptCredentials(server.url, false, null).then(
                function(credentials) {
                  server.username = credentials.username;
                  server.authentication = $.base64.encode(credentials.username + ':' + credentials.password);
                  server.config.alwaysAnonymous = false;

                  // remove the 'wms endpoint'
                  var serverBaseUrl = urlRemoveLastRoute(server.url);
                  var serverAuthenticationUrl = serverBaseUrl + '/rest/settings.json';
                  serverAuthenticationUrl = serverAuthenticationUrl.replace('http://', 'http://null:null@');
                  ignoreNextScriptError = true;
                  $.ajax({
                    url: serverAuthenticationUrl,
                    type: 'GET',
                    dataType: 'jsonp',
                    jsonp: 'callback',
                    error: function() {
                      ignoreNextScriptError = false;
                    },
                    complete: doWork
                  });
                }, function(reject) {
                  server.username = translate_.instant('anonymous');
                  server.authentication = undefined;
                  server.config.alwaysAnonymous = reject.alwaysAnonymous;
                  doWork();
                });
          }
        } else {
          server.username = configService_.username;
          server.isLocal = true;

          if (server.isVirtualService === true) {
            server.name = 'Virtual Service';
          } else {
            server.name = translate_.instant('local_geoserver');
          }

          doWork();
        }
      } else {
        doWork();
      }

      return deferredResponse.promise;
    };

    this.removeServer = function(id) {
      var serverIndex = -1;
      for (var index = 0; index < servers.length; index += 1) {
        if (servers[index].id === id) {
          serverIndex = index;
          break;
        }
      }
      if (serverIndex > -1) {
        var server = servers.splice(serverIndex, 1)[0];
        rootScope_.$broadcast('server-removed', server);
      }
    };

    this.configDefaultServers = function() {
      var config = null;

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_bingsource'))) {
        config = {ptype: 'gxp_bingsource', name: 'Bing', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_bingsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_arcrestsource'))) {
        config = {
          ptype: 'gxp_arcrestsource',
          name: 'Esri',
          proj: 'EPSG:4326',
          defaultServer: true,
          alwaysAnonymous: true,
          url: 'https://services.arcgisonline.com/arcgis/rest/services/NGS_Topo_US_2D/MapServer/'
        };
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_arcrestsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapquestsource'))) {
        config = {ptype: 'gxp_mapquestsource', name: 'MapQuest', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_mapquestsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_mapboxsource'))) {
        config = {ptype: 'gxp_mapboxsource', name: 'MapBox', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_mapboxsource').defaultServer = true;
      }

      if (!goog.isDefAndNotNull(service_.getServerByPtype('gxp_osmsource'))) {
        config = {ptype: 'gxp_osmsource', name: 'OpenStreetMap', defaultServer: true};
        service_.addServer(config);
      } else {
        service_.getServerByPtype('gxp_osmsource').defaultServer = true;
      }
      if (goog.isDefAndNotNull(service_.getRegistryLayerConfig())) {
        service_.getRegistryLayerConfig().defaultServer = true;
      }
    };

    this.getLayersConfigByName = function(server_name) {
      var server = service_.getServerByName(server_name);
      if (goog.isDefAndNotNull(server)) {
        return server.layersConfig;
      }
    };

    this.getLayersConfig = function(serverId) {
      var server = service_.getServerById(serverId);
      if (goog.isDefAndNotNull(server)) {
        return server.layersConfig;
      }
    };

    this.getFullLayerConfig = function(serverId, layerName) {
      //Issue WMS request to get full layer config for mapService
      var result = q_.defer();
      var layerConfig = null;
      var server = service_.getRegistryLayerConfig();
      if (server.id != serverId) {
        result.resolve(service_.getLayerConfig(serverId, layerName));
        return result.promise;
      }
      var parser = new ol.format.WMSCapabilities();
      var url = server.url;
      var namespace = layerName.split(':')[0];
      var name = layerName.split(':')[1];
      url = url.substring(0, url.lastIndexOf('/')) + '/' + namespace;
      url += '/' + name + '/wms?request=GetCapabilities';
      server.populatingLayersConfig = true;
      var config = {};
      config.headers = {};
      if (goog.isDefAndNotNull(server.authentication)) {
        config.headers['Authorization'] = 'Basic ' + server.authentication;
      } else {
        config.headers['Authorization'] = '';
      }
      http_.get(url, config).then(function(xhr) {
        if (xhr.status === 200) {
          var response = parser.read(xhr.data);
          if (goog.isDefAndNotNull(response.Capability) && goog.isDefAndNotNull(response.Capability.Layer)) {
            layerConfig = response.Capability.Layer.Layer[0];
            result.resolve(layerConfig);
          }
        }
      });

      return result.promise;
    };

    this.getLayerConfig = function(serverId, layerName) {
      var layersConfig = service_.getLayersConfig(serverId);
      var layerConfig = null;

      for (var index = 0; index < layersConfig.length; index += 1) {
        if (layersConfig[index].Name === layerName || (typeof layerName.split != 'undefined' &&
            layersConfig[index].Name === layerName.split(':')[1])) {
          layerConfig = layersConfig[index];
          if (goog.isDefAndNotNull(layerConfig.CRS)) {
            for (var code in layerConfig.CRS) {
              if (layerConfig.CRS[code] !== 'CRS:84') {
                layerConfig.CRS = [layerConfig.CRS[code]];
                break;
              }
            }
          }
          break;
        }
      }

      return layerConfig;
    };

    var layerName = function(detailUrl) {
      if (!detailUrl) { return ''; }
      return detailUrl.split('/').pop();
    };

    var thumbnail = function(thumbnailUrl, layerName, serverUrl) {
      if (thumbnailUrl && thumbnailUrl.indexOf('missing_thumb') !== -1) {
        return serverUrl + '/reflect?format=application/openlayers&layers=' + layerName + '&width=200';
      }
      return thumbnailUrl;
    };

    var domain = function(layerInfo) {
      if (layerInfo.hasOwnProperty('domain_name')) {
        return layerInfo.domain_name;
      }
      return '';
    };
    var author = function(layerInfo) {
      if (layerInfo.owner__first_name) {
        return layerInfo.owner__first_name + ' ' + layerInfo.owner__last_name;
      }
      if (layerInfo.owner__username) {
        return layerInfo.owner__username;
      }
      if (layerInfo.LayerUsername) {
        return layerInfo.LayerUsername;
      }
      return 'No owner name available';
    };

    var createSearchLayerObject = function(layerInfo, serverUrl) {
      return {
        add: true,
        Abstract: layerInfo.abstract,
        extent: layerInfo.extent,
        Name: layerInfo.typename,
        Title: layerInfo.title,
        CRS: layerInfo.srid,
        thumbnail_url: thumbnail(layerInfo.thumbnail_url, layerName(layerInfo.detail_url), serverUrl),
        author: author(layerInfo),
        detail_url: layerInfo.detail_url
      };
    };

    var createExtentFromHyper = function(layerInfo) {
      return [layerInfo.min_x, layerInfo.min_y, layerInfo.max_x, layerInfo.max_y];
    };

    var createHyperSearchLayerObject = function(layerInfo) {
      /* Temporaly script to delete ":" extra info in layerInfo.tile_url
      * before : http://localhost/registry/hypermap/layer/44/map/wmts/osm:placenames_capital/default_grid/1/1/0.png
      * after: http://localhost/registry/hypermap/layer/44/map/wmts/placenames_capital/default_grid/1/1/0.png
      */
      if (layerInfo.tile_url) {
        var tile_url_splited = layerInfo.tile_url.split(':');

        if (tile_url_splited.length === 2) {
          var middle = tile_url_splited[0].split('/');
          middle[middle.length - 1] = '';
          layerInfo.tile_url = middle.join('/') + tile_url_splited[1];
        }
      }

      return {
        add: true,
        abstract: layerInfo.abstract,
        name: layerInfo.name,
        title: layerInfo.title,
        layerDate: layerInfo.layer_date,
        layerCategory: Array.isArray(layerInfo.layer_category) ? layerInfo.layer_category.join(', ') : null,
        layerId: layerInfo.id,
        CRS: ['EPSG:4326'],
        tile_url: layerInfo.tile_url,
        detail_url: layerInfo.tile_url ? configService_.configuration.serverLocation + layerInfo.tile_url : null,
        author: author(layerInfo),
        domain: domain(layerInfo),
        type: 'mapproxy_tms',
        extent: createExtentFromHyper(layerInfo),
        reliability: layerInfo.reliability,
        recentReliability: layerInfo.recent_reliability,
        lastStatus: layerInfo.last_status,
        phone: layerInfo['ContactInformation/Phone'],
        classification: layerInfo['classificationRecord/classification'],
        license: layerInfo['license/copyright'],
        registry: layerInfo.registry
      };
    };

    var createSearchLayerObjects = function(layerObjects, serverUrl) {
      var finalConfigs = [];
      //TODO: Update with handling multiple projections per layer if needed.
      for (var iLayer = 0; iLayer < layerObjects.length; iLayer += 1) {
        var layerInfo = layerObjects[iLayer];
        var configTemplate = createSearchLayerObject(layerInfo, serverUrl);

        finalConfigs.push(configTemplate);
      }

      return finalConfigs;
    };

    var createHyperSearchLayerObjects = function(layerObjects) {
      var finalConfigs = [];
      layerObjects = Array.isArray(layerObjects) ? layerObjects : [];

      //TODO: Update with handling multiple projections per layer if needed.
      for (var iLayer = 0; iLayer < layerObjects.length; iLayer += 1) {
        var layerInfo = layerObjects[iLayer];
        var configTemplate = createHyperSearchLayerObject(layerInfo);
        finalConfigs.push(configTemplate);
      }

      return finalConfigs;
    };

    var createAuthorizationConfigForServer = function(server) {
      var config = {};
      config.headers = {};
      if (goog.isDefAndNotNull(server.authentication)) {
        config.headers['Authorization'] = 'Basic ' + server.authentication;
      } else {
        config.headers['Authorization'] = '';
      }
      return config;
    };

    var serverGeoserversearchUrl = function(searchUrl) {
      pathArray = searchUrl.split('/');
      protocol = pathArray[0];
      host = pathArray[2];
      if (protocol.indexOf(':') !== -1) {
        return protocol + '//' + host + '/geoserver/wms';
      }
      return '/geoserver/wms';
    };

    var addSearchResults = function(searchUrl, server, layerConfigCallback) {
      var layers_loaded = false;
      server.layersConfig = [];
      server.populatingLayersConfig = true;
      var config = createAuthorizationConfigForServer(server);
      http_.get(searchUrl, config).then(function(xhr) {
        if (xhr.status === 200) {
          server.layersConfig = layerConfigCallback(xhr.data, serverGeoserversearchUrl(searchUrl));
          rootScope_.$broadcast('layers-loaded', server.id);
          layers_loaded = true;
          server.populatingLayersConfig = false;
        } else {
          layers_loaded = false;
          server.populatingLayersConfig = false;
        }
      }, function(xhr) {
        layers_loaded = false;
        server.populatingLayersConfig = false;
      });
      return layers_loaded;
    };

    this.reformatLayerHyperConfigs = function(elasticResponse, serverUrl) {
      rootScope_.$broadcast('totalOfDocs', elasticResponse['a.matchDocs']);
      if (elasticResponse['a.time']) {
        rootScope_.$broadcast('dateRangeHistogram', elasticResponse['a.time']);
      }
      return createHyperSearchLayerObjects(elasticResponse['d.docs']);
    };

    this.reformatLayerConfigs = function(elasticResponse, serverUrl) {
      return createSearchLayerObjects(elasticResponse.objects, serverUrl);
    };

    this.reformatConfigForFavorites = function(response, serverUrl) {
      var formattedResponse = response.objects.map(function(obj) { return obj.content_object; });
      return createSearchLayerObjects(formattedResponse, serverUrl);
    };

    this.applyESFilter = function(url, filter_options) {
      if (filter_options.text !== null) {
        url = url + '&q.text=' + filter_options.text;
      }
      if (filter_options.owner !== null) {
        url = url + '&owner__username__in=' + configService_.username;
      }
      if (goog.isDefAndNotNull(filter_options.minYear) && goog.isDefAndNotNull(filter_options.maxYear)) {
        url = url + '&q.time=' + encodeURIComponent('[' + filter_options.minYear + ' TO ' + filter_options.maxYear + ']');
      }

      if (goog.isDefAndNotNull(filter_options.mapPreviewCoordinatesBbox)) {
        url = url + '&q.geo=' + encodeURIComponent(filter_options.mapPreviewCoordinatesBbox);
      }

      if (filter_options.histogramFlag === true) {
        url = url + '&a.time.limit=1&a.time.gap=P1Y';
      }

      //`size` & `from` should be outside of the query, either at the begining or the end
      if (filter_options.size !== null) {
        url += '&d.docs.limit=' + filter_options.size;
      }
      if (filter_options.docsPage > 0) {
        url = url + '&d.docs.page=' + filter_options.docsPage;
      }
      return url;
    };

    this.applyFavoritesFilter = function(url, filterOptions) {
      if (filterOptions.text !== null) {
        url += '&title__contains=' + filterOptions.text;
      }
      return url;
    };

    this.populateLayersConfigElastic = function(server, filterOptions) {
      //var searchUrl = 'http://beta.mapstory.org/api/layers/search/?is_published=true&limit=100';
      var searchUrl = '/api/layers/search/?is_published=true&limit=100';
      if (filterOptions !== null) {
        searchUrl = service_.applyESFilter(searchUrl, filterOptions);
      }
      return addSearchResults(searchUrl, server, service_.reformatLayerConfigs);
    };

    this.populateLayersConfigInelastic = function(server, force, deferredResponse) {
      // prevent getCapabilities request until ran by the user.
      if (server.lazy !== true || force === true || server.mapLayerRequiresServer === true) {
        var parser = new ol.format.WMSCapabilities();
        var url = server.url;

        // If this is a virtual service, use the virtual service url for getCapabilties
        if (server.isVirtualService === true) {
          url = server.virtualServiceUrl;
        }

        var iqm = url.indexOf('?');
        var url_getcaps = url + (iqm >= 0 ? (iqm - 1 == url.length ? '' : '&') : '?') + 'SERVICE=WMS&REQUEST=GetCapabilities';

        server.populatingLayersConfig = true;
        var config = {};
        config.headers = {};
        if (goog.isDefAndNotNull(server.authentication)) {
          config.headers['Authorization'] = 'Basic ' + server.authentication;
        } else {
          config.headers['Authorization'] = '';
        }
        // server hasn't been added yet, so specify the auth headers here
        http_.get(url_getcaps, config).then(function(xhr) {
          if (xhr.status === 200) {
            var response = parser.read(xhr.data);
            if (goog.isDefAndNotNull(response.Capability) &&
                goog.isDefAndNotNull(response.Capability.Layer)) {
              server.layersConfig = response.Capability.Layer.Layer;
              console.log('---- populateLayersConfig.populateLayersConfig server', server);
              rootScope_.$broadcast('layers-loaded', server.id);
              deferredResponse.resolve(server);
            } else {
              deferredResponse.resolve(server);
            }
            server.populatingLayersConfig = false;
          } else {
            deferredResponse.resolve(server);
            server.populatingLayersConfig = false;
          }
        }, function(xhr) {
          deferredResponse.resolve(server);
          server.populatingLayersConfig = false;
        });
      } else {
        deferredResponse.resolve(server);
        server.populatingLayersConfig = false;
      }

      return deferredResponse;
    };

    this.addSearchResultsForHyper = function(server, filterOptions, catalog) {
      if (!goog.isDefAndNotNull(catalog)) {
        return;
      }
      var searchUrl = configService_.configuration.serverLocation + catalog.search_url + '?';

      if (filterOptions !== null) {
        searchUrl = service_.applyESFilter(searchUrl, filterOptions);
      }
      return addSearchResults(searchUrl, server, service_.reformatLayerHyperConfigs);
    };

    this.addSearchResultsForFavorites = function(server, filterOptions) {
      var searchUrl = '/api/favorites/?content_type=42&limit=100';
      if (filterOptions !== null) {
        searchUrl = this.applyFavoritesFilter(searchUrl, filterOptions);
      }
      return addSearchResults(searchUrl, server, service_.reformatConfigForFavorites);
    };

    this.populateLayersConfig = function(server, force) {
      var deferredResponse = q_.defer();

      if (!goog.isDefAndNotNull(server)) {
        //TODO: make sure it is okay to reject and then return the promise
        deferredResponse.reject();
        return deferredResponse.promise;
      }

      if (!goog.isDefAndNotNull(server.layersConfig) ||
          (goog.isDefAndNotNull(force) && force)) {

        // clear out layers config
        server.layersConfig = [];

        if (server.ptype === 'gxp_bingsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'Bing';
          }
          var bing_api_key = 'ApCiIdI8N4-OPZRLbs6Nt2FZjK-wr0lRmx1hiZH5iPZAnn3VfmEnEqWJSTnABYt4';
          server.layersConfig = [
            {Title: 'BingRoad', Name: 'Road', sourceParams: {imagerySet: 'Road', key: bing_api_key}},
            {Title: 'BingAerial', Name: 'Aerial', sourceParams: {imagerySet: 'Aerial', key: bing_api_key}},
            {Title: 'BingAerialWithLabels', Name: 'AerialWithLabels',
              sourceParams: {imagerySet: 'AerialWithLabels', key: bing_api_key}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_arcrestsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'Esri';
          }

          // get esri layer configs from config service if they exist
          _getEsriLayersConfig = function() {
            var esriIndex = null;
            var configSources = configService_.configuration.sources;
            var configMapLayers = configService_.configuration.map.layers;
            var lyrsCfg = [];
            // get gxp_arcsource server index
            for (var i = 0; i < configSources.length; i++) {
              if (configSources[i]['ptype'] === 'gxp_arcrestsource') {
                esriIndex = i;
              }
            }
            // get all layers that reference gxp_arcsource server
            for (var k = 0; k < configMapLayers.length; k++) {
              if (configMapLayers[k]['source'] === esriIndex) {
                var cnf = {
                  Title: configMapLayers[k].title || 'NGS Topographic',
                  Name: configMapLayers[k].name || 'NGS_Topo_US_2D',
                  proj: configMapLayers[k].proj || 'EPSG:4326',
                  sourceParams: {
                    layer: configMapLayers[k].name || 'NGS_Topo_US_2D'
                  }
                };
                lyrsCfg.push(cnf);
              }
            }
            return lyrsCfg;
          };

          //if esri layer configs are already included in the config service, use those
          var esriLayersConfig = _getEsriLayersConfig();
          if (esriLayersConfig.length > 0) {
            server.layersConfig = esriLayersConfig;
          } else {
            server.layersConfig = [
              {Title: 'NGS Topographic', Name: 'NGS_Topo_US_2D', proj: 'EPSG:4326', sourceParams: {layer: 'NGS_Topo_US_2D'}}
            ];
          }

          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_osmsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'OpenStreetMap';
          }
          server.layersConfig = [
            {Title: 'OpenStreetMap', Name: 'mapnik'}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_mapboxsource') {
          server.defaultServer = true;
          if (!goog.isDefAndNotNull(server.name)) {
            server.name = 'MapBox';
          }
          server.layersConfig = [
            {Title: 'MapBoxBlueMarbleTopoBathyJan', Name: 'blue-marble-topo-bathy-jan',
              sourceParams: {layer: 'blue-marble-topo-bathy-jan'}},
            {Title: 'MapBoxBlueMarbleTopoBathyJul', Name: 'blue-marble-topo-bathy-jul',
              sourceParams: {layer: 'blue-marble-topo-bathy-jul'}},
            {Title: 'MapBoxBlueMarbleTopoJan', Name: 'blue-marble-topo-jan',
              sourceParams: {layer: 'blue-marble-topo-jan'}},
            {Title: 'MapBoxBlueMarbleTopoJul', Name: 'blue-marble-topo-jul',
              sourceParams: {layer: 'blue-marble-topo-jul'}},
            {Title: 'MapBoxControlRoom', Name: 'control-room',
              sourceParams: {layer: 'control-room'}},
            {Title: 'MapBoxGeographyClass', Name: 'geography-class',
              sourceParams: {layer: 'geography-class'}},
            {Title: 'MapBoxNaturalEarthHypso', Name: 'natural-earth-hypso',
              sourceParams: {layer: 'natural-earth-hypso'}},
            {Title: 'MapBoxNaturalEarthHypsoBathy', Name: 'natural-earth-hypso-bathy',
              sourceParams: {layer: 'natural-earth-hypso-bathy'}},
            {Title: 'MapBoxNaturalEarth1', Name: 'natural-earth-1',
              sourceParams: {layer: 'natural-earth-1'}},
            {Title: 'MapBoxNaturalEarth2', Name: 'natural-earth-2',
              sourceParams: {layer: 'natural-earth-2'}},
            {Title: 'MapBoxWorldDark', Name: 'world-dark',
              sourceParams: {layer: 'world-dark'}},
            {Title: 'MapBoxWorldLight', Name: 'world-light',
              sourceParams: {layer: 'world-light'}},
            {Title: 'MapBoxWorldPrint', Name: 'world-print',
              sourceParams: {layer: 'world-print'}}
          ];
          deferredResponse.resolve(server);
        } else if (server.ptype === 'gxp_tilejsonsource') {

          //first we need to add/connect to the server. we need to init some placeholder
          //layersConfig data just so to satisfy some logic in the doWork() function above.
          //The logic itself should be re-analyzed in the future.
          server.defaultServer = true;
          server.layersConfig = [
            {Title: 'Loading...', Name: 'null'}
          ];

          //NOTE: server.sourceParams is only undefined when the server is being added via the add server dialog. This is because
          //the user will have entered the 'get' params as part of the URL in one long string. In this case the params are parsed
          //out following the next comment block.
          var json_parms = {
            url: goog.isDefAndNotNull(server.sourceParams) ? server.url + '?' + server.sourceParams : server.url,
            crossOrigin: true
          };

          //change the url on both server and server.config to truncate the request parameters (we'll store the params in sourceParams below),
          //urls are only allowed 200 chars max in the database when serialization occurs. sourceParams on the other hand
          //is serialized as a straight-up text object.
          if (!goog.isDefAndNotNull(server.sourceParams)) {
            var splitURL = server.url.split('?');
            var urlSansParameters = splitURL[0];
            var urlParams = '';
            if (splitURL.length > 1) {
              urlParams = splitURL[1];
            }
            server.config.url = urlSansParameters;
            server.config.sourceParams = urlParams;
            server.url = urlSansParameters;
          }

          //In order to populate the layer list, (once connected to the server) we need to override the TileJSON class from openlayers.
          //The payload that comes back into code, the JSON, is stripped of the name attribute. Hence, we overload the handler
          //to intercept the full JSON and keep track of the name for the layer list etc.
          var TileJSONClass = {};
          angular.copy(ol.source.TileJSON.prototype, TileJSONClass);

          //HACK: We need to know if there is an xhr error (Currently TileJSON provides no feedback if there is).
          //This is slightly unsafe if another xhr goes out and returns during this one
          //because the callback will be removed before it gets a chance to execute here.
          addXMLRequestCallback(function(xhr) {
            xhr.onerror = function() {
              deferredResponse.reject(server);
            };
            XMLHttpRequest.callbacks.length = 0;
          });

          //this internally fires off the 'get' call
          var jsontile_source = new TileJSONClass.constructor(json_parms);

          //copy and override the handler functions that are 'inherited' from ol.source.TileJSON
          //this is how the full json returns/errors are intercepted
          if (!goog.isDefAndNotNull(jsontile_source.responseHandler)) {
            jsontile_source.responseHandler = jsontile_source.handleTileJSONResponse;
          }

          jsontile_source.handleTileJSONResponse = function(tileJSON) {
            server.layersConfig[0].Title = tileJSON.name;
            server.layersConfig[0].Name = tileJSON.id;
            server.layersConfig[0].sourceParams = {urlArgs: urlParams, layer: tileJSON.id};
            server.layersConfig[0].bounds = tileJSON.bounds;
            this.responseHandler(tileJSON);
            deferredResponse.resolve(server);
          };

          if (!goog.isDefAndNotNull(jsontile_source.errorResponseHandler)) {
            jsontile_source.errorResponseHandler = jsontile_source.handleTileJSONError;
          }

          jsontile_source.handleTileJSONError = function() {
            this.errorResponseHandler();
            deferredResponse.reject(server);
          };

          //stash the returned source in the layersConfig so MapService.js can instantiate the tile later on
          server.layersConfig[0].TileJSONSource = jsontile_source;

        } else if (server.ptype === 'gxp_wmscsource' ||
            server.ptype === 'gxp_tmssource') { // currently, if it is a tms endpoint, assume it has wmsgetcapabilities
          if (!goog.isDefAndNotNull(server.url)) {
            dialogService_.error(translate_.instant('error'), translate_.instant('server_url_not_specified'));
            deferredResponse.reject(server);
          } else if (server.elastic) {
            // @TODO: enable the function below when the elastic geoserver being
            // used has elastic serach functionality enabled.
            // service_.populateLayersConfigElastic(server, null);
            deferredResponse.resolve(server);
          } else {
            deferredResponse = service_.populateLayersConfigInelastic(server, force, deferredResponse);
          }
        } else {
          deferredResponse.reject();
        }
      } else {
        deferredResponse.reject();
      }

      return deferredResponse.promise;
    };

  });
}());

function addXMLRequestCallback(callback) {
  var oldSend, i;
  if (XMLHttpRequest.callbacks) {
    // we've already overridden send() so just add the callback
    XMLHttpRequest.callbacks.push(callback);
  } else {
    // create a callback queue
    XMLHttpRequest.callbacks = [callback];
    // store the native send()
    oldSend = XMLHttpRequest.prototype.send;
    // override the native send()
    XMLHttpRequest.prototype.send = function() {
      // process the callback queue
      // the xhr instance is passed into each callback but seems pretty useless
      // you can't tell what its destination is or call abort() without an error
      // so only really good for logging that a request has happened
      // I could be wrong, I hope so...
      // EDIT: I suppose you could override the onreadystatechange handler though
      for (i = 0; i < XMLHttpRequest.callbacks.length; i++) {
        XMLHttpRequest.callbacks[i](this);
      }
      // call the native send()
      oldSend.apply(this, arguments);
    };
  }
}
