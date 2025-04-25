/**
 * Copyright (C) 2019  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

"use strict";

// List of all HTML fields in a Person fieldset.
const personFields = [
    'givenName',
    'familyName',
    'name',
    'email',
    'id',
    'affiliation',
];

function createPersonFieldset(personPrefix, legend) {
    // Creates a fieldset containing inputs for informations about a person
    var fieldset = document.createElement("fieldset")
    var moveButtons;
    fieldset.classList.add("person");
    fieldset.classList.add("leafFieldset");
    fieldset.id = personPrefix;

    let rolInputs = '';

    if (personPrefix.includes("_reference_")) {  
        rolInputs += `
            <input type="hidden" id="${personPrefix}_role_index" value="0" />
            <input type="button" id="${personPrefix}_role_add" value="Add one role" style="display: none;" />
        `;
    } else {
        rolInputs += `
            <input type="hidden" id="${personPrefix}_role_index" value="0" />
            <input type="button" id="${personPrefix}_role_add" value="Add one role" />
    `;
    }

    fieldset.innerHTML = `
        <legend>${legend}</legend>

        <p>
            <label for="${personPrefix}_type">Type Author: </label>
            <select id="${personPrefix}_type" name="${personPrefix}_type" onchange="toggleAuthorType('${personPrefix}')">
                <option value="Person">Person</option>
                <option value="Organization">Organization</option>
            </select>
        </p>

        <!-- Move Buttons  -->
        <div class="moveButtons">
            <input type="button" id="${personPrefix}_moveToLeft" value="<" class="moveToLeft"
                title="Moves this person to the left." /> Change priority 
            <input type="button" id="${personPrefix}_moveToRight" value=">" class="moveToRight"
                title="Moves this person to the right." />
        </div>

        <p>
            <label for="${personPrefix}_givenName">Given name</label>
            <input type="text" id="${personPrefix}_givenName" name="${personPrefix}_givenName"
                placeholder="Jane" />
        </p>
        <p style="display: none;>
            <label for="${personPrefix}_name">Name</label>
            <input type="text" id="${personPrefix}_name" name="${personPrefix}_name"
                placeholder="Organization" />
        </p>
        <p>
            <label for="${personPrefix}_familyName">Family name</label>
            <input type="text" id="${personPrefix}_familyName" name="${personPrefix}_familyName"
                placeholder="Doe" />
        </p>      
        <p>
            <label for="${personPrefix}_email">E-mail address</label>
                <input type="email" id="${personPrefix}_email" name="${personPrefix}_email"
                    placeholder="jane.doe@example.org" />
        </p>
        <p>
            <label for="${personPrefix}_id">URI</label>
            <input type="url" id="${personPrefix}_id" name="${personPrefix}_id"
                    placeholder="http://orcid.org/0000-0002-1825-0097" />
        </p>
        <p>
            <label for="${personPrefix}_affiliation">Affiliation</label>
            <input type="text" id="${personPrefix}_affiliation" name="${personPrefix}_affiliation"
                    placeholder="Department of Computer Science, University of Pisa" />
        </p>

        ${rolInputs}
    `;

    // if (personPrefix.includes("_reference_")) {  
    //     document.getElementById(`${personPrefix}_role_add`).parentElement.style.display = 'none';
    // }
//     fieldset.innerHTML = `
//         <legend>${legend}</legend>
//         <div class="moveButtons">
//             <input type="button" id="${personPrefix}_moveToLeft" value="<" class="moveToLeft"
//                 title="Moves this person to the left." />
//             <input type="button" id="${personPrefix}_moveToRight" value=">" class="moveToRight"
//                 title="Moves this person to the right." />
//         </div>
//         <p>
//             <label for="${personPrefix}_givenName">Given name</label>
//             <input type="text" id="${personPrefix}_givenName" name="${personPrefix}_givenName"
//                 placeholder="Jane" required="true" />
//         </p>
//         <p>
//             <label for="${personPrefix}_familyName">Family name</label>
//             <input type="text" id="${personPrefix}_familyName" name="${personPrefix}_familyName"
//                 placeholder="Doe" />
//         </p>
//         <p>
//             <label for="${personPrefix}_email">E-mail address</label>
//             <input type="email" id="${personPrefix}_email" name="${personPrefix}_email"
//                 placeholder="jane.doe@example.org" />
//         </p>
//         <p>
//             <label for="${personPrefix}_id">URI</label>
//             <input type="url" id="${personPrefix}_id" name="${personPrefix}_id"
//                 placeholder="http://orcid.org/0000-0002-1825-0097" />
//         </p>
//         <p>
//         <label for="${personPrefix}_affiliation">Affiliation</label>
//             <input type="text" id="${personPrefix}_affiliation" name="${personPrefix}_affiliation"
//                 placeholder="Department of Computer Science, University of Pisa" />
//         </p>
//         <input type="hidden" id="${personPrefix}_role_index" value="0" />
//         <input type="button" id="${personPrefix}_role_add" value="Add one role" />
//     `;

    return fieldset;
}

function createKeywordFieldset(keywordPrefix, legend) {
    // Creates a fieldset containing inputs for informations about a person
    var fieldsetk = document.createElement("fieldset")

    fieldsetk.classList.add("keyword");
    fieldsetk.classList.add("leafFieldset");
    fieldsetk.id = keywordPrefix;

    fieldsetk.innerHTML = `
        <legend>${legend}</legend>
        <p>
            <label for="${keywordPrefix}_name">Name</label>
            <input type="text" id="${keywordPrefix}_name" name="${keywordPrefix}_name"
                placeholder="keyword" />
        </p>
        <p>
            <label for="${keywordPrefix}_id">URI of defined term (if applicable)</label>
            <input type="url" id="${keywordPrefix}_id" name="${keywordPrefix}_id"
                placeholder="https://example.com/keyword" />
        </p>
        `;
    
    return fieldsetk;
}

function addPersonWithId(container, prefix, legend, id) {
    var personPrefix = `${prefix}_${id}`;
    var fieldset = createPersonFieldset(personPrefix, `${legend} #${id}`);

    container.appendChild(fieldset);

    document.querySelector(`#${personPrefix}_moveToLeft`)
        .addEventListener('click', () => movePerson(prefix, id, "left"));
    document.querySelector(`#${personPrefix}_moveToRight`)
        .addEventListener('click', () => movePerson(prefix, id, "right"));
    document.querySelector(`#${personPrefix}_role_add`)
        .addEventListener('click', () => addRole(personPrefix));
}

function addKeywordWithId(containerk, id) {
    var keywordPrefix = `keyword_${id}`;
    var fieldset = createKeywordFieldset(keywordPrefix, `Keyword #${id}`);
    containerk.appendChild(fieldset);
}

function movePerson(prefix, id1, direction) {
    var nbPersons = getNbPersons(prefix);
    var id2;

    // Computer id2, the id of the person to flip id1 with (wraps around the
    // end of the list of persons)
    if (direction == "left") {
        id2 = id1 - 1;
        if (id2 <= 0) {
            id2 = nbPersons;
        }
    }
    else {
        id2 = id1 + 1;
        if (id2 > nbPersons) {
            id2 = 1;
        }
    }
    // Intercambiar el tipo de cada autor
    var type1Element = document.getElementById(`${prefix}_${id1}_type`);
    var type2Element = document.getElementById(`${prefix}_${id2}_type`);

    if (!type1Element || !type2Element) return;

    var tempType = type1Element.value;
    type1Element.value = type2Element.value;
    type2Element.value = tempType;

    // Intercambiar valores de todos los campos definidos en `personFields`
    personFields.forEach((fieldName) => {
        var field1 = document.getElementById(`${prefix}_${id1}_${fieldName}`);
        var field2 = document.getElementById(`${prefix}_${id2}_${fieldName}`);

        if (field1 && field2) {
            var tempValue = field1.value;
            field1.value = field2.value;
            field2.value = tempValue;
        }
    });

    toggleAuthorType(`${prefix}_${id1}`);
    toggleAuthorType(`${prefix}_${id2}`);

    // Form was changed; regenerate
    generateCodemeta();
}

function addPerson(prefix, legend) {
    var container = document.querySelector(`#${prefix}_container`);
    var personId = getNbPersons(prefix) + 1;

    addPersonWithId(container, prefix, legend, personId);

    setNbPersons(prefix, personId);
    
    if (`#${prefix}_container` == '#author_reference_container') {
        const authors = document.querySelectorAll('fieldset.person.leafFieldset');
        currentAuthorRefIndex = authors.length - 1;
        document.getElementById('current_author_reference_index').value = currentAuthorRefIndex;

        updateAuthorRefCarousel();
        updateAuthorCount();

        if (adjustContainers("review_container", "fieldsetCurrentVersion")) {
            const textarea = document.getElementById("releaseNotes");
            textarea.rows = 37;
        }
        // if (adjustContainers("review_container", "fieldsetRuntime") && personId == 1) {
        //     const textarea = document.getElementById("softwareRequirements");
        //     textarea.rows = 37;
        // }
    }
    return personId;
}

function adjustContainers(element1, element2) {
    const rect1 = document.getElementById(element1).getBoundingClientRect();
    const rect2 = document.getElementById(element2).getBoundingClientRect();

    return Math.abs(rect1.top - rect2.top) < 10; 
}

function addKeyword() {

    var containerk = document.querySelector(`#keyword_container`);
    var keywordId = getNbKeywords() + 1;

    addKeywordWithId(containerk, keywordId);
    setNbKeywords(keywordId);

    return keywordId;
}

function removeKeyword(keywordId, deleteStorage) {
    var keywordId = getNbKeywords();
    document.querySelector(`#keyword_${keywordId}`).remove();

    setNbKeywords(keywordId - 1);

    if (deleteStorage)
        generateCodemeta();
}

function removePerson(prefix, deleteStorage) {
    var personId = getNbPersons(prefix);
    document.querySelector(`#${prefix}_${personId}`).remove();
    setNbPersons(prefix, personId - 1);

    if (prefix === 'author_reference') {
        const authors = document.querySelectorAll('fieldset.person.leafFieldset');
        currentAuthorRefIndex = Math.min(currentAuthorRefIndex, authors.length - 1);
        document.getElementById('current_author_reference_index').value = currentAuthorRefIndex;

        updateAuthorRefCarousel();
        updateAuthorCount();

        if (adjustContainers("review_container", "fieldsetCurrentVersion") && personId == 1) {
            const textarea = document.getElementById("releaseNotes");
            textarea.rows = 10;
        }
        // if (adjustContainers("review_container", "fieldsetRuntime") && personId == 1) {
        //     const textarea = document.getElementById("softwareRequirements");
        //     textarea.rows = 10;
        // }
    }
    if (deleteStorage)
        generateCodemeta();
}

// Initialize a group of persons (authors, contributors) on page load.
// Useful if the page is reloaded.
function initPersons(prefix, legend) {
    var nbPersons = getNbPersons(prefix);
    var personContainer = document.querySelector(`#${prefix}_container`)
    for (let personId = 1; personId <= nbPersons; personId++) {
        addPersonWithId(personContainer, prefix, legend, personId);
    }
}

function initKeywords() {
    var nbKeywords = getNbKeywords();
    var keywordContainer = document.querySelector(`#keyword_container`)
 
    for (let keywordId = 1; keywordId <= nbKeywords; keywordId++) {
        addKeywordWithId(keywordContainer, keywordId);
    }
}

function removePersons(prefix, deleteStorage) {
    var nbPersons = getNbPersons(prefix);
    var personContainer = document.querySelector(`#${prefix}_container`)

    for (let personId = 1; personId <= nbPersons; personId++) {
        removePerson(prefix, deleteStorage)
    }
}

function removeKeywords(deleteStorage) {
    // setTimeout(() => {
    var nbKeywords = getNbKeywords();
    for (let keywordId = 1; keywordId <= nbKeywords; keywordId++) {
        removeKeyword(keywordId, deleteStorage)
    }
    // }, 1000);
}

function addRole(personPrefix) {
    const roleButtonGroup = document.querySelector(`#${personPrefix}_role_add`);
    const roleIndexNode = document.querySelector(`#${personPrefix}_role_index`);
    const roleIndex = parseInt(roleIndexNode.value, 10);

    const ul = document.createElement("ul")
    ul.classList.add("role");
    ul.id = `${personPrefix}_role_${roleIndex}`;

    if (personPrefix.includes("_reference_")) {
        ul.innerHTML = `
        <li><label for="${personPrefix}_roleName_${roleIndex}">Role</label>
            <select class="roleName" id="${personPrefix}_roleName_${roleIndex}" name="${personPrefix}_roleName_${roleIndex}">
                <option value="">Select rol</option>
                <option value="Conceptualization">Conceptualization</option>
                <option value="Data curation">Data curation</option>
                <option value="Formal analysis">Formal analysis</option>
                <option value="Funding acquisition">Funding acquisition</option>
                <option value="Investigation">Investigation</option>
                <option value="Methodology">Methodology</option>
                <option value="Project administration">Project administration</option>
                <option value="Resources">Resources</option>
                <option value="Software">Software</option>
                <option value="Supervision">Supervision</option>
                <option value="Validation">Validation</option>
                <option value="Visualization">Visualization</option>
                <option value="Writing – original draft">Writing – original draft</option>
                <option value="Writing – review & editing">Writing – review & editing</option>
            </select>
                </li>
        <li><input type="button" id="${personPrefix}_role_remove_${roleIndex}" value="X" title="Remove role" /></li>
    `;
    } else {
                    // <input type="text" class="roleName" id="${personPrefix}_roleName_${roleIndex}" name="${personPrefix}_roleName_${roleIndex}"
            //     placeholder="Developer" size="10" /></li>
        ul.innerHTML = `
        <li><label for="${personPrefix}_roleName_${roleIndex}">Role</label>
            <select class="roleName" id="${personPrefix}_roleName_${roleIndex}" name="${personPrefix}_roleName_${roleIndex}">
                <option value="">Select rol</option>
                <option value="Conceptualization">Conceptualization</option>
                <option value="Data curation">Data curation</option>
                <option value="Formal analysis">Formal analysis</option>
                <option value="Funding acquisition">Funding acquisition</option>
                <option value="Investigation">Investigation</option>
                <option value="Methodology">Methodology</option>
                <option value="Project administration">Project administration</option>
                <option value="Resources">Resources</option>
                <option value="Software">Software</option>
                <option value="Supervision">Supervision</option>
                <option value="Validation">Validation</option>
                <option value="Visualization">Visualization</option>
                <option value="Writing – original draft">Writing – original draft</option>
                <option value="Writing – review & editing">Writing – review & editing</option>
            </select>

        <li><label for="${personPrefix}_startDate_${roleIndex}">Start date:</label>
            <input type="date" class="startDate" id="${personPrefix}_startDate_${roleIndex}" name="${personPrefix}_startDate_${roleIndex}" /></li>
        <li><label for="${personPrefix}_endDate_${roleIndex}">End date:</label>
            <input type="date" class="endDate" id="${personPrefix}_endDate_${roleIndex}" name="${personPrefix}_endDate_${roleIndex}" /></li>
        <li><input type="button" id="${personPrefix}_role_remove_${roleIndex}" value="X" title="Remove role" /></li>
    `;
    }

    roleButtonGroup.after(ul);

    document.querySelector(`#${personPrefix}_role_remove_${roleIndex}`)
        .addEventListener('click', () => removeRole(personPrefix, roleIndex));

    roleIndexNode.value = roleIndex + 1;

    return roleIndex;
}

function removeRole(personPrefix, roleIndex) {
    document.querySelector(`#${personPrefix}_role_${roleIndex}`).remove();
}

function resetForm() {
    removePersons('author', false);
    removePersons('contributor', false);
    removePersons('author_reference', false);
    removeKeywords(false);
    RemoveRequirements()
    // Reset the list of selected licenses
    document.getElementById("selected-licenses").innerHTML = '';
    const urlRepoInput = document.getElementById("url_repo");
    if (urlRepoInput) {
        urlRepoInput.value = '';
    } 
    const selectedLicensesHidden = document.getElementById("selectedLicensesHidden");
    if (selectedLicensesHidden) {
        selectedLicensesHidden.value = '';
    } 
    const licenseField = document.getElementById("license");
    if (licenseField) {
        licenseField.setAttribute('placeholder', ''); 
        licenseField.value = ''; 
    } 
    // Reset the form after deleting elements, so nbPersons doesn't get
    // reset before it's read.
    document.querySelector('#inputForm').reset();
}

function fieldToLower(event) {
    event.target.value = event.target.value.toLowerCase();
}

function initCallbacks() {
    document.querySelector('#license')
        .addEventListener('change', validateLicense);

    document.querySelector('#downloadRepo').disabled = false;
    document.querySelector('#downloadRepo')
        .addEventListener('click', () => migrateRemoteRepository());

    document.querySelector('#url_repo').disabled = false;
    document.querySelector('#url_repo')
        .addEventListener('keydown', (event) => getRepoDefault(event));

    document.querySelector('#generateCodemetaV2').disabled = false;
    document.querySelector('#generateCodemetaV2')
        .addEventListener('click', () => generateCodemeta("2.0"));

    document.querySelector('#generateCodemetaV3').disabled = false;
    document.querySelector('#generateCodemetaV3')
        .addEventListener('click', () => generateCodemeta("3.0"));

    document.querySelector('#resetForm')
        .addEventListener('click', resetForm);

    document.querySelector('#validateCodemeta').disabled = false;
    document.querySelector('#validateCodemeta')
        .addEventListener('click', () => parseAndValidateCodemeta(true));

    document.querySelector('#importCodemeta').disabled = false;
    document.querySelector('#importCodemeta')
        .addEventListener('click', importCodemeta);

    document.querySelector('#downloadCodemeta input').disabled = false;
    document.querySelector('#downloadCodemeta input')
        .addEventListener('click', downloadCodemeta);

    document.querySelector('#inputForm')
        .addEventListener('change', () => generateCodemeta());

    document.querySelector('#developmentStatus')
        .addEventListener('change', fieldToLower);

    initPersons('author', 'Author');
    initPersons('contributor', 'Contributor');
    initKeywords();
}

function toggleAuthorType(prefix) {
    
    const typeSelect = document.getElementById(`${prefix}_type`);
    const isPerson = typeSelect.value === "Person"; 

    const givenNameField = document.getElementById(`${prefix}_givenName`)?.parentElement;
    const familyNameField = document.getElementById(`${prefix}_familyName`)?.parentElement;
    const affiliationField = document.getElementById(`${prefix}_affiliation`)?.parentElement;
    const nameField = document.getElementById(`${prefix}_name`)?.parentElement;

    if (givenNameField) givenNameField.style.display = isPerson ? "block" : "none";
    if (familyNameField) familyNameField.style.display = isPerson ? "block" : "none";
    if (affiliationField) affiliationField.style.display = isPerson ? "block" : "none";
    if (nameField) nameField.style.display = isPerson ? "none" : "block";

    const givenNameInput = document.getElementById(`${prefix}_givenName`);
    if (!isPerson && givenNameInput) givenNameInput.value = "";

    const familyNameInput = document.getElementById(`${prefix}_familyName`);
    if (!isPerson && familyNameInput) familyNameInput.value = "";

    const affiliationInput = document.getElementById(`${prefix}_affiliation`);
    if (!isPerson && affiliationInput) affiliationInput.value = "";

    const nameInput = document.getElementById(`${prefix}_name`);
    if (isPerson && nameInput) nameInput.value = "";

}

function addRowRequirements(name = "", version = "") {

    let table = document.getElementById("softwareRequirements").getElementsByTagName('tbody')[0];
    let newRow = table.insertRow();
    newRow.innerHTML = `<td><input type="text" name="nameText" value="${name}"></td>` +
                       `<td><input type="text" name="version" value="${version}"></td>` +
                       `<td><button onclick="deleteRowRequirements(this)">-</button></td>`; 
                       
    generateCodemeta();

}

function deleteRowRequirements(button) {
    let row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
    generateCodemeta();
}

function RemoveRequirements() {
    let tableBody = document.querySelector("#softwareRequirements tbody");
    tableBody.innerHTML = "";

    generateCodemeta(); 
}
