/*
 * Route controller.
 */

/*
 * Module dependencies.
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var express = require('express');
var async = require('async');

/**
 * Main route controller class.
 *
 * @param {Application} application Application.
 * @param {Object} settings Application settings object.
 * @class RouteController
 */
var RouteController = module.exports = function(application, settings) {
  this.application = application;
  this.settings = settings;

  var self = this;
  var app = this.application.application;

  app.all(self.settings.path, function(request, response) {
    self.handle(request, response);
  });
};

/**
 * Handle a request.
 *
 * @param {Request} request Request object.
 * @param {Response} response Response object
 */
RouteController.prototype.handle = function(request, response) {
  var self = this;
  var settings = this.settings;

  this.access(request, response, function(err, allow) {
    if (allow) {
      // A route can have either a content or callback property.
      if (settings.content) {
        self.respond(request, response, settings.content);
      }
      else if (settings.callback) {
        settings.callback(request, response, function(err, content, code) {
          if (content) {
            self.respond(request, response, content, code);
          }
          else {
            // If there's no content, return 404 error.
            self.notFound(request, response);
          }
        });
      }
    }
    else {
      // Access denied.
      self.forbidden(request, response);
    }
  });
};

/**
 * Access check.
 *
 * @param {Request} request Request object.
 * @param {Response} response Response object.
 * @param {Function} callaback Function called with the access check results.
 */
RouteController.prototype.access = function(request, response, callback) {
  var self = this;
  var settings = this.settings;

  // If this is an object, do access check and other mandatory stuff.
  if (settings.access) {
    if (typeof settings.access === 'boolean') {
      // Access check is a string/permission key.
      return callback(null, settings.access);
    }
    else if (typeof settings.access === 'function') {
      // Access check is a callback.
      return settings.access(request, response, callback);
    }
  }

  // Default to false. Deny access.
  return callback(null, false);
};

/**
 * Respond to a request.
 *
 * @param {Request} request Request object.
 * @param {Response} response Response object.
 * @param {Object|String} content Content to send.
 * @param {Number} [code] HTTP status code.
 */
RouteController.prototype.respond = function(request, response, content, code) {
  // Default to 200 (success).
  var code = code || 200;

  var payload = {
    status: {
      code: code
    }
  };

  var alerts = request.flash();
  if (Object.keys(alerts).length > 0) {
    payload.alerts = alerts;
  }

  if (content) {
    payload.data = content;
  }

  response.send(code, payload);
};

/**
 * Respond to a request with a "page not found" error.
 *
 * @param {Request} request Request object.
 * @param {Response} response Response object.
 */
RouteController.prototype.notFound = function(request, response) {
  this.respond(request, response, {
    title: 'Page not found',
    description: "The page you're looking for wasn't found."
  }, 404);
};

/**
 * Respond to a request with a "forbidden" error.
 *
 * @param {Request} request Request object.
 * @param {Response} response Response object.
 */
RouteController.prototype.forbidden = function(request, response) {
  this.respond(request, response, {
    title: 'Forbidden',
    description: "You don't have permission to access this page."
  }, 403);
};
