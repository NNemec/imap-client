'use strict';

var rewire = require('rewire'),
    expect = require('chai').expect,
    inbox = require('inbox'),
    EventEmitter = require('events').EventEmitter,
    imapClient = rewire('../index'),
    JsMockito = require('jsmockito').JsMockito,
    JsHamcrest = require('jshamcrest').JsHamcrest,
    ibNsMock, loginOptions, ibMock, MpMock, stream, attmt;


JsMockito.Integration.Nodeunit();
JsHamcrest.Integration.Nodeunit();

stream = new EventEmitter();
attmt = {
    generatedFileName: 'poopoo',
    contentType: 'text/poopoo',
    stream: stream
};

loginOptions = {
    port: 1234,
    host: 'spiegel.de',
    auth: {
        user: 'dummyUser',
        pass: 'dummyPass'
    },
    secure: true
};

ibMock = (function() {
    var o = new EventEmitter();

    o.expect = function(name) {
        o[name + 'Count']++;
    };

    o.closeCount = 0;
    o.close = function() {
        expect(o.closeCount).to.be.ok;
        o.closeCount--;
        o.emit('close');
    };

    o.connectCount = 0;
    o.connect = function() {
        expect(o.connectCount).to.be.ok;
        o.connectCount--;
        o.emit('connect');
    };

    o.listMailboxesCount = 0;
    o.listMailboxes = function(callback) {
        var hasNoChildren, listNoChildren;

        hasNoChildren = function() {
            return false;
        };
        listNoChildren = function(cb) {
            cb(null, []);
        };

        expect(o.listMailboxesCount).to.be.ok;
        o.listMailboxesCount--;

        if (callback) {
            callback(undefined, [{
                path: 'AROUNDBOX',
                listChildren: function(cb) {
                    cb(null, [{
                        path: 'AROUNDBOX/FooBar',
                        listChildren: function(cb) {
                            cb(null, [{}, {}, {}, {}, {}]);
                        },
                        hasChildren: hasNoChildren
                    }, {
                        path: 'AROUNDBOX/PooBar',
                        hasChildren: hasNoChildren,
                        listChildren: listNoChildren
                    }, {
                        path: 'AROUNDBOX/Duh',
                        hasChildren: hasNoChildren,
                        listChildren: listNoChildren
                    }, {
                        path: 'AROUNDBOX/asdasdasd',
                        hasChildren: hasNoChildren,
                        listChildren: listNoChildren
                    }]);
                }
            }, {
                path: 'INBOX',
                hasChildren: hasNoChildren,
                listChildren: listNoChildren
            }, {
                path: 'OUTBOX',
                hasChildren: hasNoChildren,
                listChildren: listNoChildren
            }]);
        }
    };

    o.openMailboxCount = 0;
    o.openMailbox = function(path, options, callback) {
        expect(o.openMailboxCount).to.be.ok;
        o.openMailboxCount--;

        if (path && callback) {
            callback(undefined, {
                name: path,
                path: path,
                hasChildren: false,
                disabled: false
            });
        }
    };

    o.listMessagesCount = 0;
    o.listMessages = function(from, limit, callback) {
        expect(o.listMessagesCount).to.be.ok;
        o.listMessagesCount--;

        callback(undefined, [{
            UID: 126,
            date: new Date(),
            from: {
                address: "stuff@bla.io",
                name: "Test Sender"
            },
            messageId: "<5c4fbb30-042f-11e3-8ffd-0800200c9a66@foomail.com>",
            title: "Nodemailer Test",
            to: [{
                address: "testtest1@gmail.com",
                name: "testtest1"
            }],
            cc: [{
                address: "testtest2@gmail.com",
                name: "testtest2"
            }],
            bcc: [{
                address: "testtest3@gmail.com",
                name: "testtest3"
            }]
        }]);
    };

    o.createMessageStreamCount = 0;
    o.createMessageStream = function(uid) {
        expect(o.createMessageStreamCount).to.be.ok;
        o.createMessageStreamCount--;

        expect(uid).to.be.ok;
        return {
            pipe: function(obj) {
                obj.emit('end', {
                    headers: {
                        date: new Date(),
                    },
                    messageId: "<5c4fbb30-042f-11e3-8ffd-0800200c9a66@foomail.com>",
                    from: [{
                        address: "stuff@bla.io",
                        name: "Test Sender"
                    }],
                    to: [{
                        address: "testtest1@gmail.com",
                        name: "testtest1"
                    }],
                    cc: [{
                        address: "testtest2@gmail.com",
                        name: "testtest2"
                    }],
                    bcc: [{
                        address: "testtest3@gmail.com",
                        name: "testtest3"
                    }],
                    subject: "Nodemailer Test",
                    text: "Lorem ipsum dolor sin amet...",
                    attachments: [attmt]
                });
                obj.emit('attachment', attmt);
                stream.emit('data', new Buffer('poo'));
                stream.emit('data', new Buffer('poo'));
                stream.emit('end');
            }
        };
    };

    o.resetMock = function() {
        o.closeCount = 0;
        o.listMailboxesCount = 0;
        o.openMailboxCount = 0;
        o.listMessagesCount = 0;
        o.createMessageStreamCount = 0;
        o.addFlagsCount = 0;
    };

    return o;
})();
ibNsMock = mock(inbox);
when(ibNsMock).createConnection(anything()).thenReturn(ibMock);

MpMock = mockFunction();
when(MpMock)().thenReturn(new EventEmitter());

imapClient.__set__({
    MailParser: MpMock,
    inbox: ibNsMock
});


describe('ImapClient unit tests', function() {
    describe('initialize with user and password', function() {
        it('should initialize', function() {
            var ic = new imapClient.ImapClient(loginOptions);
            expect(ic._client).to.equal(ibMock);
        });
    });
});

describe('ImapClient unit tests', function() {
    var ic;

    beforeEach(function() {
        ic = new imapClient.ImapClient(loginOptions);
        expect(ic._client).to.equal(ibMock);
    });


    afterEach(function() {
        ibMock.resetMock();
    });

    describe('login', function() {
        it('should login', function(done) {
            ibMock.expect('connect');
            ic.login(done);
        });
    });

    describe('logout', function() {
        it('should logout', function(done) {
            ibMock.expect('close');
            ic.logout(done);
        });
    });

    describe('list folders', function() {
        it('should list folders', function(done) {
            ibMock.expect('listMailboxes');
            ic.listFolders(function(error, mailboxes) {
                expect(mailboxes.length).to.equal(3);
                done();
            });
        });
    });

    describe('list subfolders', function() {
        it('should list subfolders', function(done) {
            ibMock.expect('listMailboxes');
            ic.listFolders('AROUNDBOX/FooBar', function(error, mailboxes) {
                expect(mailboxes).to.not.be.empty;
                done();
            });
        });
    });

    describe('list an empty subfolder', function() {
        it('should list subfolders', function(done) {
            ibMock.expect('listMailboxes');
            ic.listFolders('AROUNDBOX/Duh', function(error, mailboxes) {
                expect(error).to.not.exist;
                expect(mailboxes).to.exist;
                expect(mailboxes).to.be.empty;
                done();
            });
        });
    });

    describe('list messages', function() {
        it('should list messages', function(done) {
            ibMock.expect('openMailbox');
            ibMock.expect('listMessages');
            ic.listMessages({
                path: 'foobar',
                offset: 0,
                length: 1
            }, function(err, messages) {
                expect(messages.length).to.equal(1);
                expect(messages[0].id).to.equal("<5c4fbb30-042f-11e3-8ffd-0800200c9a66@foomail.com>");
                expect(messages[0].uid).to.equal(126);
                expect(messages[0].from).to.deep.equal([{
                    address: "stuff@bla.io",
                    name: "Test Sender"
                }]);
                expect(messages[0].to).to.deep.equal([{
                    address: "testtest1@gmail.com",
                    name: "testtest1"
                }]);
                expect(messages[0].cc).to.deep.equal([{
                    address: "testtest2@gmail.com",
                    name: "testtest2"
                }]);
                expect(messages[0].bcc).to.deep.equal([{
                    address: "testtest3@gmail.com",
                    name: "testtest3"
                }]);
                expect(messages[0].subject).to.equal("Nodemailer Test");
                expect(messages[0].body).to.not.be.ok;
                expect(messages[0].sentDate).to.be.ok;
                done();
            });
        });
    });

    describe('get message', function() {
        it('should get a specific message', function(done) {
            ibMock.expect('openMailbox');
            ibMock.expect('createMessageStream');
            ic.getMessage({
                path: 'INBOX',
                uid: 123
            }, function(error, message) {
                expect(error).to.be.null;
                expect(message.id).to.equal("<5c4fbb30-042f-11e3-8ffd-0800200c9a66@foomail.com>");
                expect(message.from).to.deep.equal([{
                    address: "stuff@bla.io",
                    name: "Test Sender"
                }]);
                expect(message.to).to.deep.equal([{
                    address: "testtest1@gmail.com",
                    name: "testtest1"
                }]);
                expect(message.cc).to.deep.equal([{
                    address: "testtest2@gmail.com",
                    name: "testtest2"
                }]);
                expect(message.bcc).to.deep.equal([{
                    address: "testtest3@gmail.com",
                    name: "testtest3"
                }]);
                expect(message.subject).to.equal("Nodemailer Test");
                expect(message.body).to.be.ok;
                expect(message.sentDate).to.be.ok;
                expect(message.attachments.length).to.equal(1);
                expect(message.attachments[0]).to.equal(attmt);
            }, function(error, attachment) {
                expect(error).to.not.exist;
                expect(attachment.fileName).to.equal('poopoo');
                expect(attachment.contentType).to.equal('text/poopoo');
                expect(attachment.uint8Array).to.exist;
                done();
            });
        });
    });
});