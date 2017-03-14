const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const graphqlExecution = require('graphql/execution/execute');
const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLError
} = require('graphql');

const lazyExecutor = require('../');

chai.use(sinonChai);

const callback = sinon.stub();
const expect = chai.expect;
const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            name: {
                type: GraphQLString,
                args: {
                    age: {
                        type: GraphQLInt
                    }
                },
                resolve: (root, {
                    age
                }, context, info) => {
                    callback(root, context);

                    return age ? `${root.name} - ${age}` : root.name;
                }
            },
            dog: {
                type: GraphQLString,
                args: {
                    age: {
                        type: GraphQLInt
                    }
                },
                resolve: (root, {
                    age
                }, context, info) => {
                    return age ? `${root.dog} - ${age}` : root.dog;
                }
            },
            error: {
                type: GraphQLString,
                resolve: () => {
                    throw new Error('error');
                }
            }
        }
    }),
});

const customValidator = context => {
    return {
        OperationDefinition: node => {
            context.reportError(new GraphQLError('Custom validation error', [node]));
        }
    }
};

describe('index.js', () => {
    let executeSpy;

    before(() => {
        executeSpy = sinon.spy(graphqlExecution, 'execute');

        callback.reset();
    });

    after(() => {
        executeSpy.restore();
    });

    it('should return a function and parsed query', () => {
        const executor = lazyExecutor(schema, `{name}`);

        expect(executor).to.be.a('function');
        expect(executor.parsedQuery).to.be.an('object');
    });

    it('should concat custom validator', () => {
        expect(() => lazyExecutor(schema, `{name}`, customValidator)).to.throw('GraphQLError: Custom validation error');
    });

    it('should pass root and context', done => {
        const nameDogQuery = lazyExecutor(schema, `{name, dog}`);

        nameDogQuery({
                name: 'Rohde',
                dog: 'Heron'
            }, {
                context: 'context'
            })
            .subscribe(response => {
                expect(callback).to.have.been.calledWith({
                    name: 'Rohde',
                    dog: 'Heron'
                }, {
                    context: 'context'
                });
            }, null, done);
    });

    it('should not execute query if no one subscribed', () => {
        const nameQuery = lazyExecutor(schema, `{name}`);

        nameQuery({
            name: 'Rohde'
        });

        expect(executeSpy).not.to.have.been.called;
    });

    it('should execute query', done => {
        const nameQuery = lazyExecutor(schema, `{name}`);

        nameQuery({
                name: 'Rohde'
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde'
                });
            }, null, done);
    });

    it('should execute query with args', done => {
        const nameQuery = lazyExecutor(schema, `{name(age: 20)}`);

        nameQuery({
                name: 'Rohde'
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20'
                });
            }, null, done);
    });

    it('should execute multiple queries', done => {
        const nameDogQuery = lazyExecutor(schema, `{name, dog}`);

        nameDogQuery({
                name: 'Rohde',
                dog: 'Heron'
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde',
                    dog: 'Heron'
                });
            }, null, done);
    });

    it('should execute multiple queries with args', done => {
        const nameDogQuery = lazyExecutor(schema, `{name(age: 20), dog(age: 3)}`);

        nameDogQuery({
                name: 'Rohde',
                dog: 'Heron'
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20',
                    dog: 'Heron - 3'
                });
            }, null, done);
    });

    it('should execute query with variables', done => {
        const nameQuery = lazyExecutor(schema, `
            query($age: Int!){
                name(age: $age)
            }
        `);

        nameQuery({
                name: 'Rohde'
            }, null, {
                age: 20
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20'
                });
            }, null, done);
    });

    it('should execute multiple queries with variables', done => {
        const nameQuery = lazyExecutor(schema, `
            query($age: Int!, $dogAge: Int!){
                name(age: $age)
                dog(age: $dogAge)
            }
        `);

        nameQuery({
                name: 'Rohde',
                dog: 'Heron'
            }, null, {
                age: 20,
                dogAge: 3
            })
            .subscribe(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20',
                    dog: 'Heron - 3'
                });
            }, null, done);
    });

    it('should handle query runtime errors', done => {
        const nameQuery = lazyExecutor(schema, `
            query($age: Int!){
                name(age: $age)
            }
        `);

        nameQuery({
                name: 'Rohde'
            }, null, {
                age: 'NaN'
            })
            .subscribe(null, err => {
                expect(err.message).to.equal('Variable "$age" got invalid value "NaN".\nExpected type "Int", found "NaN": Int cannot represent non 32-bit signed integer value: NaN')

                done();
            });
    });

    it('should handle missing variable errors', done => {
        const nameQuery = lazyExecutor(schema, `
            query($age: Int!){
                name(age: $age)
            }
        `);

        nameQuery({
                name: 'Rohde'
            })
            .subscribe(null, err => {
                expect(err.message).to.equal('Variable "$age" of required type "Int!" was not provided.')

                done();
            });
    });

    it('should handle query error', () => {
        expect(() => lazyExecutor(schema, `{name{name}}`)).to.throw('GraphQLError: Field "name" must not have a selection since type "String" has no subfields.');
    });

    it('should handle internal error', done => {
        const errorQuery = lazyExecutor(schema, `{
            error
        }`);

        errorQuery()
            .subscribe(null, err => {
                expect(err.message).to.equal('GraphQLError: error');
                done();
            });
    });
});
