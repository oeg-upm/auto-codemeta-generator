/**
 * Copyright (C) 2019  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

"use strict";

function getNbPersons(prefix) {
    console.log('---> nº persons')
    var nbField = document.querySelector(`#${prefix}_nb`);
    console.log(nbField)
    return parseInt(nbField.value, 10);
}

function getNbKeywords() {
    console.log('---> nº keywords')
    var nbField = document.querySelector(`#keyword_nb`);
    console.log(nbField)
    return parseInt(nbField.value, 10);
}

function setNbPersons(prefix, nb) {
    var nbField = document.querySelector(`#${prefix}_nb`);
    nbField.value = nb;
}

function setNbKeywords(nb) {
    var nbField = document.querySelector(`#keyword_nb`);
    nbField.value = nb;
}
function setError(msg) {
    document.querySelector("#errorMessage").innerHTML = msg;
}

function trimSpaces(s) {
    return s.replace(/^\s+|\s+$/g, '');
}

// From https://stackoverflow.com/a/43467144
function isUrl(s) {
    try {
        new URL(s);
        return true;
    } catch (e) {
        return false;
    }
}

function isBlankNodeId(s) {
    return typeof s === 'string' && s.startsWith("_:");
}

function isUrlOrBlankNodeId(s) {
    return isUrl(s) || isBlankNodeId(s);
}
