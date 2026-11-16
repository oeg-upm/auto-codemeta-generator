/**
 * Tests for the CodeMeta 4.0 terms added to the generator.
 */

"use strict";

describe('CodeMeta 4.0 terms', function() {
    beforeEach(function() {
        /* Clear the session storage, as it is used to restore field data;
         * and we don't want a test to load data from the previous test. */
        cy.window().then((win) => {
            win.sessionStorage.clear()
        })
        cy.visit('./index.html');
    });

    function generateV4() {
        cy.get('#generateCodemetaV4').click();
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').should(($el) => {
            expect($el.text().trim()).to.not.equal('');
        });
        return cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()));
    }

    it('uses CodeMeta 4.0 as the default version', function() {
        cy.get('#name').type('My Test Software');

        // No version button is clicked: generateCodemeta() uses its default.
        cy.window().then((win) => win.generateCodemeta());

        cy.get('#codemetaText').should(($el) => {
            expect($el.text().trim()).to.not.equal('');
        });
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .its('@context')
            .should('equal', 'https://w3id.org/codemeta/4.0');
    });

    it('exports alternateName as one entry per line', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#alternateName').type('Alias One{enter}Alias Two');

        generateV4().then((doc) => {
            expect(doc.alternateName).to.deep.equal(['Alias One', 'Alias Two']);
        });
    });

    it('exports creditText, citeAsID and archivedAt', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#creditText').type('Garijo, D. (My Test Software)');
        cy.get('#citeAsID').type('https://doi.org/10.5281/zenodo.123456');
        cy.get('#archivedAt').type('https://archive.softwareheritage.org/swh:1:rev:abc');

        generateV4().then((doc) => {
            expect(doc.creditText).to.equal('Garijo, D. (My Test Software)');
            expect(doc.citeAsID).to.equal('https://doi.org/10.5281/zenodo.123456');
            expect(doc.archivedAt).to.deep.equal([
                'https://archive.softwareheritage.org/swh:1:rev:abc'
            ]);
        });
    });

    it('always exports featureList as an array, even with a single feature', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#featureList_add').click();
        cy.get('#featureList_1_text').type('Ontology validation');

        generateV4().then((doc) => {
            expect(Array.isArray(doc.featureList)).to.equal(true);
            expect(doc.featureList).to.deep.equal(['Ontology validation']);
        });
    });

    it('exports one featureList entry per feature box', function() {
        cy.get('#name').type('My Test Software');

        cy.get('#featureList_add').click();
        cy.get('#featureList_1_text').type('Ontology validation');

        cy.get('#featureList_add').click();
        cy.get('#featureList_2_text').type('REST API');

        generateV4().then((doc) => {
            expect(doc.featureList).to.deep.equal(['Ontology validation', 'REST API']);
        });
    });

    it('exports a companion work in citeWith', function() {
        cy.get('#name').type('My Test Software');

        cy.get('#citeWith_add').click();
        cy.get('#citeWith_1_type').select('ScholarlyArticle');
        cy.get('#citeWith_1_identifier').type('10.1162/qss_a_00167');
        cy.get('#citeWith_1_url').type('https://doi.org/10.1162/qss_a_00167');
        cy.get('#citeWith_1_name').type('A companion paper');
        cy.get('#citeWith_1_datePublished').type('2021');

        generateV4().then((doc) => {
            expect(doc.citeWith).to.deep.equal({
                "@type": "ScholarlyArticle",
                "identifier": "10.1162/qss_a_00167",
                "url": "https://doi.org/10.1162/qss_a_00167",
                "name": "A companion paper",
                "datePublished": "2021"
            });
        });
    });

    it('imports all CodeMeta 4.0 terms', function() {
        const doc = {
            "@context": "https://w3id.org/codemeta/4.0",
            "@type": ["SoftwareSourceCode", "SoftwareApplication"],
            "name": "Imported Software",
            "alternateName": ["Alias One", "Alias Two"],
            "creditText": "Garijo, D. (Imported Software)",
            "featureList": ["Feature A", "Feature B"],
            "citeAsID": "https://doi.org/10.5281/zenodo.123456",
            "archivedAt": "https://archive.softwareheritage.org/swh:1:rev:abc",
            "citeWith": {
                "@type": "ScholarlyArticle",
                "identifier": "10.1162/qss_a_00167",
                "url": "https://doi.org/10.1162/qss_a_00167",
                "name": "A companion paper",
                "datePublished": "2021"
            }
        };

        cy.get('#codemetaText').then((elem) => elem.text(JSON.stringify(doc)));
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'Imported Software');
        cy.get('#alternateName').should('have.value', 'Alias One\nAlias Two');
        cy.get('#creditText').should('have.value', 'Garijo, D. (Imported Software)');
        cy.get('#citeAsID').should('have.value', 'https://doi.org/10.5281/zenodo.123456');
        cy.get('#archivedAt').should('have.value', 'https://archive.softwareheritage.org/swh:1:rev:abc');

        // featureList becomes one textarea per feature
        cy.get('#featureList_container fieldset').should('have.length', 2);
        cy.get('#featureList_1_text').should('have.value', 'Feature A');
        cy.get('#featureList_2_text').should('have.value', 'Feature B');

        // citeWith becomes one block with its own fields
        cy.get('#citeWith_container fieldset.citeWith').should('have.length', 1);
        cy.get('#citeWith_1_type').should('have.value', 'ScholarlyArticle');
        cy.get('#citeWith_1_identifier').should('have.value', '10.1162/qss_a_00167');
        cy.get('#citeWith_1_url').should('have.value', 'https://doi.org/10.1162/qss_a_00167');
        cy.get('#citeWith_1_name').should('have.value', 'A companion paper');
        cy.get('#citeWith_1_datePublished').should('have.value', '2021');
    });
});