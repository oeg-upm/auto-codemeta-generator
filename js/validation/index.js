/**
 * Copyright (C) 2020  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

/*
 * Reads a Codemeta file and shows human-friendly errors on it.
 *
 * This validator intentionaly does not use a schema, in order to show errors
 * that are easy to understand for users with no understanding of JSON-LD.
 */

// const FASTAPI_URL = 'http://127.0.0.1:7877'; 
let CONFIG = {};

let currentAuthorRefIndex = 0;

fetch('./js/config.json')
    .then(response => response.json())
    .then(data => {
        CONFIG = data;
    })
    .catch(error => {
        console.error('Error loading config:', error);
    });
function validateDocument(doc) {
    if (!Array.isArray(doc) && typeof doc != 'object') {
        setError("Document must be an object (starting and ending with { and }), not ${typeof doc}.")
        return false;
    }
    // TODO: validate id/@id

    // TODO: check there is either type or @type but not both
    var type = getDocumentType(doc);
    if (type === undefined) {
        setError("Missing type (must be SoftwareSourceCode or SoftwareApplication).")
        return false;
    }
    else if (!isCompactTypeEqual(type, "SoftwareSourceCode") && !isCompactTypeEqual(type, "SoftwareApplication")) {
        // Check this before other fields, as a wrong type error is more
        // understandable than "invalid field".
        setError(`Wrong document type: must be "SoftwareSourceCode"/"SoftwareApplication", not ${JSON.stringify(type)}`)
        return false;
    }
    else {
        return Object.entries(doc).every((entry) => {
            var fieldName = entry[0];
            var subdoc = entry[1];
            if (fieldName == "@context") {
                // Was checked before
                return true;
            }
            else if (fieldName == "type" || fieldName == "@type") {
                // Was checked before
                return true;
            }
            else if (isFieldFromOtherVersionToIgnore(fieldName)) {
                // Do not check fields from other versions FIXME
                return true;
            }
            else {
                var validator = softwareFieldValidators[fieldName];
                if (validator === undefined) {
                    // TODO: find if it's a field that belongs to another type,
                    // and suggest that to the user
                    setError(`Unknown field "${fieldName}".`)
                    return false;
                }
                else {
                    return validator(fieldName, subdoc);
                }
            }
        });
    }
}

function getRepoDefault(event) {
    if (event.key === "Tab" && event.target.value.trim() === '') {

        event.preventDefault(); 
        event.target.value = CONFIG.default_repo; 
    }
}


function parseAndValidateCodemeta(showPopup) {
    var codemetaText = document.querySelector('#codemetaText').innerText;
    var doc;
    try {
        doc = JSON.parse(codemetaText);
    }
    catch (e) {
        setError(`Could not read codemeta document because it is not valid JSON (${e}). Check for missing or extra quote, colon, or bracket characters.`);
        return {};
    }

    setError("");

    var isValid = validateDocument(doc);
    if (showPopup) {
        if (isValid) {
            alert('Document is valid!')
        }
        else {
            alert('Document is invalid.');
        }
    }

    return doc;
}

function migrateRemoteRepository() {

    const spinner = document.getElementById('spinner');
    const repoUrlInput = document.getElementById('url_repo'); 
    const repoUrl = repoUrlInput.value;  
    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }; 

    spinner.style.display = 'block'

    if (!repoUrl) {
        spinner.style.display = 'none';
        alert('Please enter the repository URL.');
        return;
    }
    resetForm()
    repoUrlInput.value = repoUrl;  
    const apiUrl = CONFIG.fastapi_url.replace(/\/$/, ""); 
    fetch(`${apiUrl}/metadata?url=${encodeURIComponent(repoUrl)}&threshold=0.8&ignoreClassifiers=false`, 
    requestOptions)
    .then(response => {

        if (!response.ok) {
            throw new Error('Error in server response');
        }
        return response.json(); 
    })
    .then(metadata => {
        spinner.style.display = 'none';

        populateFieldsCodemeta(metadata);

        setTimeout(() => {
            // alert('Metadata received and fields updated!');
            generateCodemeta()
        }, 100); 
    })
    .catch(error => {
        spinner.style.display = 'none';
        console.error('Error:', error);
        alert('There was an error extracting data from the repository.');
    });

}

// this with pure json no codemeta
function populateFields(metadata) {

    if (metadata.keywords && metadata.keywords.length > 0) {
        const keywords = metadata.keywords.map(k => k.result.value).join(', ');
        document.getElementById('keywords').value = keywords;
    }
    if (metadata.description && metadata.description.length > 0) {
        const description = metadata.description[0].result.value;
        document.getElementById('description').value = description;
    }
    if (metadata.full_title && metadata.full_title.length > 0) {
        const fullTitle = metadata.full_title[0].result.value;
        document.getElementById('name').value = fullTitle;
    }
    if (metadata.identifier && metadata.identifier.length > 0) {
        const identifier = metadata.identifier[0].result.value;
        document.getElementById('identifier').value = identifier;
    }
    if (metadata.type && metadata.type.length > 0) {
        const type = metadata.type;
        document.getElementById('applicationCategory').value = type;
    }
    if (metadata.date_created && metadata.date_created.length > 0) {
        const rawDate = metadata.date_created[0].result.value;
        const formattedDate = rawDate.split('T')[0]; // Formatear a YYYY-MM-DD
        document.getElementById('dateCreated').value = formattedDate;
    }

    if (metadata.license && metadata.license.length > 0) {
        const selectedLicensesDiv = document.getElementById('selected-licenses');
        selectedLicensesDiv.innerHTML = ''; 

        metadata.license.forEach(lic => {
            const spdxId = lic.result.spdx_id;
            if (spdxId) {
                const newLicense = document.createElement('div');
                newLicense.innerHTML = `
                    <span class="license-id">${spdxId}</span>
                    <button type="button" class="remove-license" onclick="removeLicense(this)">Remove</button>
                `;
                selectedLicensesDiv.appendChild(newLicense);
            }
        });
    }

    if (metadata.releases && metadata.releases.length > 0) {
        let oldestDatePublished = metadata.releases[0].result.date_published;
        let latestDatePublished = metadata.releases[0].result.date_published;
        let latestHtmlUrl = metadata.releases[0].result.html_url;
        let latestDescription = metadata.releases[0].result.description
        let latestTag = metadata.releases[0].result.tag;

        metadata.releases.forEach(release => {
            const datePublished = release.result.date_published;
            if (new Date(datePublished) < new Date(oldestDatePublished)) {
                oldestDatePublished = datePublished;
            }
            if (new Date(datePublished) > new Date(latestDatePublished)) {
                latestDatePublished = datePublished;
                latestTag = release.result.tag;
                latestHtmlUrl = release.result.html_url
                latestDescription = release.result.description
            }
        });
        const formattedDatePublished = oldestDatePublished.split('T')[0]; // Formatear a YYYY-MM-DD
        const formattedDateModified = latestDatePublished.split('T')[0];
        document.getElementById('datePublished').value = formattedDatePublished;
        document.getElementById('version').value = latestTag;
        document.getElementById('downloadUrl').value = latestHtmlUrl;
        document.getElementById('releaseNotes').value = latestDescription;
        document.getElementById('dateModified').value = formattedDateModified;
    }

    if (metadata.code_repository && metadata.code_repository.length > 0) {
        const codeRepository = metadata.code_repository[0].result.value;
        document.getElementById('codeRepository').value = codeRepository;
    }

    if (metadata.issue_tracker && metadata.issue_tracker.length > 0) {
        const issueTracker = metadata.issue_tracker[0].result.value;
        document.getElementById('issueTracker').value = issueTracker;
    }

    let relatedLinks = [];
    if (metadata.related_documentation && metadata.related_documentation.length > 0) {
        relatedLinks = relatedLinks.concat(metadata.related_documentation.map(doc => doc.result.value));
    }
    if (metadata.related_papers && metadata.related_papers.length > 0) {
        relatedLinks = relatedLinks.concat(metadata.related_papers.map(paper => paper.result.value));
    }
    if (relatedLinks.length > 0) {
        document.getElementById('relatedLink').value = relatedLinks.join('\n');
    }
    if (metadata.programming_languages && metadata.programming_languages.length > 0) {
        const programmingLanguages = metadata.programming_languages.map(lang => lang.result.value).join(', ');
        document.getElementById('programmingLanguage').value = programmingLanguages;
    }
    if (metadata.requirements && metadata.requirements.length > 0) {
        const softwareRequirements = metadata.requirements
        .map(req => req.result.value.trim())
        .filter(req => req !== '/' && req !== '')
        .join(', ');
        document.getElementById('softwareRequirements').value = softwareRequirements;
    }

    if (metadata.repository_status && metadata.repository_status.length > 0) {
        const statusUrl = metadata.repository_status[0].result.value;
        const statusMatch = statusUrl.match(/#([^/]+)/);
        if (statusMatch) {
            const statusValue = statusMatch[1]; 
            document.getElementById('developmentStatus').value = statusValue;
        }
    }
    
    if (metadata.citation && metadata.citation.length > 0) {
        let authors = getAuthors(metadata.citation)

        if (authors.length > 0) {
            populateAuthors(authors, false)
        }   
    }
}

//it seems with codemeta.json we obtein less information than pure json. 
function populateFieldsCodemeta(metadata) {
  
    if (metadata.keywords) {
        if (typeof metadata.keywords === 'string') {
            metadata.keywords = metadata.keywords.split(',').map(k => k.trim());
        } else if (!Array.isArray(metadata.keywords)) {
            metadata.keywords = [];
        }
        populateKeywords(metadata.keywords)
    }

    if (metadata.description) {
        let description;
        if (Array.isArray(metadata.description)) {
            description = metadata.description.join(' ');
        } else {
            description = metadata.description; // Asumir que ya es una cadena de texto
        }
        document.getElementById('description').value = description;
    }

    if (metadata['@type']) {
        let type = metadata['@type'];
        document.getElementById('applicationCategory').value = type;
    }
    if (metadata.name) {
        let fullTitle;
        if (Array.isArray(metadata.name)) {
            name = metadata.name.map(ft => ft.result.value).join(', ');
        } else {
            name = metadata.name; 
        }
        document.getElementById('name').value = name;
    }

    if (metadata.identifier) {
        let identifier;
        if (Array.isArray(metadata.identifier)) {         
            identifier = metadata.identifier.join(', ');
        } else {
            identifier = metadata.identifier; 
        }
        document.getElementById('identifier').value = identifier;
    }

    if (metadata.dateCreated) {
        let dateCreated;
        if (Array.isArray(metadata.dateCreated)) {
            dateCreated = metadata.dateCreated.map(dc => dc.result.value.split('T')[0]).join(', ');
        } else {
            dateCreated = metadata.dateCreated.split('T')[0]; // Asumir que ya es una cadena de texto
        }
        document.getElementById('dateCreated').value = dateCreated;
    }

    if (metadata.dateModified) {
        let dateModified;
        if (Array.isArray(metadata.dateModified)) {
            dateModified = metadata.dateModified.map(dm => dm.result.value.split('T')[0]).join(', ');
        } else {
            dateModified = metadata.dateModified.split('T')[0]; // Asumir que ya es una cadena de texto
        }
        document.getElementById('dateModified').value = dateModified;
    }
    if (metadata.datePublished) {
        let datePublished;
        if (Array.isArray(metadata.datePublished)) {
            datePublished = metadata.datePublished.map(dm => dm.result.value.split('T')[0]).join(', ');
        } else {
            datePublished = metadata.datePublished.split('T')[0]; 
        }
        document.getElementById('datePublished').value = datePublished;
    }
    if (metadata.codeRepository) {
        document.getElementById('codeRepository').value = metadata.codeRepository;
    }
    if (metadata.continuousIntegration) {
        document.getElementById('contIntegration').value = metadata.continuousIntegration;
    }
    if (metadata.issueTracker) {
        document.getElementById('issueTracker').value = metadata.issueTracker;
    }

    if (metadata.license  && metadata.license.identifier) {
        const selectedLicensesDiv = document.getElementById('selected-licenses');
        selectedLicensesDiv.innerHTML = ''; 

        const selectedLicensesHidden = document.getElementById('selectedLicensesHidden');
        selectedLicensesHidden.value = ''; 
        const licenseField = document.getElementById('license');
        licenseField.setAttribute('placeholder', '');

        const spdxId = metadata.license.identifier.split('/').pop();
        const newLicense = document.createElement('div');
        newLicense.innerHTML = `
            <span class="license-id">${spdxId}</span>
            <button type="button" class="remove-license" onclick="removeLicense(this)">Remove</button>
        `;
        selectedLicensesDiv.appendChild(newLicense);
        selectedLicensesHidden.value = spdxId;
        licenseField.setAttribute('placeholder', spdxId);
    }

    if (metadata.downloadUrl) {
        document.getElementById('downloadUrl').value = metadata.downloadUrl;
    }
    if (metadata.softwareVersion) {
        document.getElementById('version').value = metadata.softwareVersion;
    }
    if (metadata.releaseNotes) {
        document.getElementById('releaseNotes').value = metadata.releaseNotes;
    }

   if (metadata.referencePublication && metadata.referencePublication.length > 0) {

        // TODO: For now, we only take the first reference we find, but in the future we need to find out a way to display all the references because it’s an array.
        const firstPublication = metadata.referencePublication[0]; 

        if (firstPublication.url) 
            document.getElementById('referencePublicationUrl').value = firstPublication.url;
        if (firstPublication.name) 
            document.getElementById('publicationTitle').value = firstPublication.name;
        if (firstPublication.identifier) 
            document.getElementById('publicationDOI').value = firstPublication.identifier;
        if (firstPublication.issn) 
            document.getElementById('issn').value = firstPublication.issn;
        if (firstPublication.datePublished)
            document.getElementById('publicationDatePublished').value = firstPublication.datePublished;
        if (firstPublication.author && firstPublication.author.length > 0) 
            populateAuthors(firstPublication.author, true)

   }

    if (metadata.relatedLinks){
        let relatedLinks = metadata.relatedLinks
        .map(pub => pub.url)
        .filter((url, index, self) => url && self.indexOf(url) === index); 
        document.getElementById('relatedLink').value = relatedLinks.join('\n');
    } 

    if (metadata.programmingLanguage && metadata.programmingLanguage.length > 0) {
        const programmingLanguages = metadata.programmingLanguage.join(', ');
        document.getElementById('programmingLanguage').value = programmingLanguages;
    }

    if (metadata.softwareRequirements && metadata.softwareRequirements.length > 0) {
        const softwareRequirementsArray = metadata.softwareRequirements
        metadata.softwareRequirements.forEach(req => {
            let name = "";
            let version = "";
    
            if (typeof req === "string") {
                name = req; 
            } else {
                name = req.name ? req.name : "";
                version = req.version ? req.version : "";
            }
            addRowRequirements(name, version);
        });
    }

    if (metadata.developmentStatus) {
        document.getElementById('developmentStatus').value = metadata.developmentStatus;
    }

    if (metadata.author && metadata.author.length > 0) {
        populateAuthors(metadata.author, false)
    }
}

function getAuthors(citation) {

    let authorsMap = new Map();
    citation.forEach(cit => {
        if (cit.result.format === 'cff') {
            const cffValue = cit.result.value;
            const cffLines = cffValue.split('\n');
            let currentAuthor = null;
            let isAuthorSection = false;

            cffLines.forEach(line => {
                line = line.trim();

                if (line.startsWith("authors:")) {
                    isAuthorSection = true;
                    return; 
                }

                if (!isAuthorSection) return;
                
                const familyNameMatch = line.match(/family-names:\s*(.+)/);
                const givenNameMatch = line.match(/given-names:\s*(.+)/);
                const orcidMatch = line.match(/orcid:\s*(.+)/);
                const emailMatch = line.match(/email:\s*(.+)/);

                if (familyNameMatch) {
                    if (currentAuthor) {
                        const fullName = `${currentAuthor.familyName} ${currentAuthor.givenName}`;
                        if (authorsMap.has(fullName)) {
                            const existingAuthor = authorsMap.get(fullName);
                            currentAuthor = mergeAuthors(existingAuthor, currentAuthor);
                        }
                        authorsMap.set(fullName, currentAuthor);
                    }
                    currentAuthor = { type: 'Person', familyName: familyNameMatch[1].trim() };
                }
                if (givenNameMatch && currentAuthor) {
                    currentAuthor.givenName = givenNameMatch[1].trim();
                }
                if (orcidMatch && currentAuthor) {
                    currentAuthor.id = orcidMatch[1].trim().replace(/"/g, '');
                }
                if (emailMatch && currentAuthor) {
                    currentAuthor.email = emailMatch[1].trim();
                }
            });

            if (currentAuthor) {
                const fullName = `${currentAuthor.familyName} ${currentAuthor.givenName}`;
                if (authorsMap.has(fullName)) {
                    const existingAuthor = authorsMap.get(fullName);
                    currentAuthor = mergeAuthors(existingAuthor, currentAuthor);
                }
                authorsMap.set(fullName, currentAuthor);
            }
        }
    }); 

    const authors = Array.from(authorsMap.values());
    return authors
}

function mergeAuthors(existingAuthor, newAuthor) {
    return {
        type: 'Person',
        familyName: existingAuthor.familyName || newAuthor.familyName,
        givenName: existingAuthor.givenName || newAuthor.givenName,
        id: existingAuthor.id || newAuthor.id,
        email: existingAuthor.email || newAuthor.email
    };
}

function populateAuthors(authors, reference) {
    // We remove the previously created authors to avoid overlap.”
    if (reference) {
        const authorReferenceContainer = document.querySelector('#author_reference_container');
        authorReferenceContainer.innerHTML = `
                <legend>Authors</legend>
                <input type="hidden" id="author_reference_nb" value="0" />
                <input type="hidden" id="current_author_reference_index" value="0" />

                <div id="addRemoveAuthor">
                    <button type="button" onclick="showPrevAuthorRef()">←</button>
                    <input type="button" id="author_reference_add" value="Add one"
                        onclick="addPerson('author_reference', 'Author_ref');" />
                    <input type="button" id="author_reference_remove" value="Remove last"
                        onclick="removePerson('author_reference', true);" />
                    <button type="button" onclick="showNextAuthorRef()">→</button>
                    <label id="authorCountLabel">Nº Authors: 0</label>
                </div>
        `;
    } else {
        const authorContainer = document.querySelector('#author_container');
        authorContainer.innerHTML = `
            <legend>Authors</legend>
            <input type="hidden" id="author_nb" value="0" />
            <div id="addRemoveAuthor">
                <input type="button" id="author_add" value="Add one" onclick="addPerson('author', 'Author');" />
                <input type="button" id="author_remove" value="Remove last" onclick="removePerson('author', true);" />
            </div>
        `;
    }


    authors.forEach((author, index) => {

        const authorType = author['@type'] || 'Person';
        if (authorType !== "Person" && authorType !== "Organization") {
            return; 
        }
        const personType = reference ? 'author_reference' : 'author';
        const personId = addPerson(personType, 'Author');
        const personPrefix = `${personType}_${personId}`;

        // const personId = addPerson('author', 'Author');
        // const personPrefix = `author_${personId}`;
        // const authorType = author['@type'] || 'Person'; 
        const typeSelect = document.querySelector(`#${personPrefix}_type`);
      
        if (typeSelect)
            typeSelect.value = authorType;

        if (author['@type'] == 'Person'){

            document.querySelector(`#${personPrefix}_familyName`).value = author.familyName || '';
            document.querySelector(`#${personPrefix}_givenName`).value = author.givenName || '';
            document.querySelector(`#${personPrefix}_id`).value = author['@id'] || '';
            document.querySelector(`#${personPrefix}_email`).value = author.email || '';
            toggleAuthorType(personPrefix);
        } else if (authorType === 'Organization') {

            document.querySelector(`#${personPrefix}_name`).value = author.name || '';
            document.querySelector(`#${personPrefix}_id`).value = author['@id'] || '';
            document.querySelector(`#${personPrefix}_email`).value = author.email || '';
            toggleAuthorType(personPrefix);
        }
  
      
    });

    if (authors.length > 0) {
        currentAuthorRefIndex = 0;
        document.getElementById('current_author_reference_index').value = currentAuthorRefIndex;
        updateAuthorRefCarousel();
    }
}

function populateKeywords(keywords) {
    // Eliminamos las keyword previas
    const keywordsContainer = document.querySelector('#keyword_container');
    keywordsContainer.innerHTML = `
        <legend>Keywords</legend>
        <input type="hidden" id="keyword_nb" value="0" />
        <div id="addRemoveKeyword">
            <input type="button" id="keyword_add" value="Add one" onclick="addKeyword();" />
            <input type="button" id="keyword_remove" value="Remove last" onclick="removeKeyword();" />
        </div>
    `;
  
    keywords.forEach((keyword, index) => {
        const keywordId = addKeyword();
        const keywordPrefix = `keyword_${keywordId}`;

        if (typeof keyword === 'string') {
            document.querySelector(`#${keywordPrefix}_name`).value = keyword;
        } else if (typeof keyword === 'object' && keyword['@type'] === 'DefinedTerm') {
            document.querySelector(`#${keywordPrefix}_id`).value = keyword['@id'] || '';
            document.querySelector(`#${keywordPrefix}_name`).value = keyword.name || '';
        } else if (typeof keyword === 'object' && keyword['@type'] === 'URL') {
            document.querySelector(`#${keywordPrefix}_id`).value = keyword['@id'] || '';
        }

    });
}


function updateAuthorRefCarousel() {

    const container = document.getElementById('author_reference_container');
    if (!container) return;

    // Count just correct container
    const authors = container.querySelectorAll('fieldset.person.leafFieldset');

    if (authors.length === 0) return;

    const indexInput = document.getElementById('current_author_reference_index');
    currentAuthorRefIndex = parseInt(indexInput.value, 10) || 0;

    currentAuthorRefIndex = Math.min(currentAuthorRefIndex, authors.length - 1);
    currentAuthorRefIndex = Math.max(currentAuthorRefIndex, 0);
    indexInput.value = currentAuthorRefIndex; 

    authors.forEach(author => {
        author.style.display = 'none';
    });

    const currentAuthor = authors[currentAuthorRefIndex];

    if (currentAuthor) {
        currentAuthor.style.display = 'block';

        // call toggleAuthorType to adjust right visibility
        toggleAuthorType(currentAuthor.id);
    }

    document.querySelector('button[onclick="showPrevAuthorRef()"]').disabled = (currentAuthorRefIndex === 0);
    document.querySelector('button[onclick="showNextAuthorRef()"]').disabled = (currentAuthorRefIndex === authors.length - 1)

}

function showNextAuthorRef() {

    const container = document.getElementById('author_reference_container');
    if (!container) return;

    const authors = container.querySelectorAll('fieldset.person.leafFieldset');
    const total = authors.length;

    if (total === 0) return;

    currentAuthorRefIndex = Math.min(currentAuthorRefIndex + 1, authors.length - 1);
    document.getElementById('current_author_reference_index').value = currentAuthorRefIndex;

    updateAuthorRefCarousel();
}

function showPrevAuthorRef() {
    const total = document.querySelectorAll('[id^="author_reference_"][id$="_type"]').length;
    if (total === 0) return;

    currentAuthorRefIndex = Math.max(currentAuthorRefIndex - 1, 0);
    document.getElementById('current_author_reference_index').value = currentAuthorRefIndex;
    updateAuthorRefCarousel();
}

function updateAuthorCount() {
    const container = document.getElementById('author_reference_container');
    if (!container) return;

    const totalAuthors = container.querySelectorAll('fieldset.person.leafFieldset').length;
    document.getElementById('authorCountLabel').textContent = `Nº Authors: ${totalAuthors}`;
}
