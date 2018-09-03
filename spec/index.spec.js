const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const graphqlExecution = require('graphql/execution/execute');
const {
    execute,
    parse,
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
    
    it('should return a function and documentAST', () => {
        const executor = lazyExecutor({
            schema,
            source: `{name}`
        });

        expect(executor).to.be.a('function');
        expect(executor.documentAST).to.be.an('object');
    });

    it('should concat custom validator', () => {
        expect(() => lazyExecutor({
            customValidators: [customValidator],
            schema,
            source: `{name}`,
        })).to.throw('Custom validation error');
    });

    it('should pass root and context', done => {
        const nameDogQuery = lazyExecutor({
            schema,
            source: `{name, dog}`
        });

        nameDogQuery({
                rootValue: {
                    name: 'Rohde',
                    dog: 'Heron'
                },
                contextValue: {
                    context: 'context'
                }
            })
            .then(response => {
                expect(callback).to.have.been.calledWith({
                    name: 'Rohde',
                    dog: 'Heron'
                }, {
                    context: 'context'
                });

                done();
            });
    });

    it('should execute query', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `{name}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde'
                });

                done();
            });
    });

    it('should execute query with custom async executor', done => {
        const customExecutorResponse = sinon.stub();
        const customExecutor = (...args) => Promise.resolve(execute.apply(null, args))
            .then(customExecutorResponse);

        const nameQuery = lazyExecutor({
            customExecutor,
            schema,
            source: `{name}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                }
            })
            .then(() => {
                expect(customExecutorResponse).to.have.been.calledWith({
                    data: {
                        name: 'Rohde'
                    }
                });

                done();
            });
    });

    it('should execute query with args', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `{name(age: 20)}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20'
                });

                done();
            });
    });

    it('should execute multiple queries', done => {
        const nameDogQuery = lazyExecutor({
            schema,
            source: `{name, dog}`
        });

        nameDogQuery({
                rootValue: {
                    name: 'Rohde',
                    dog: 'Heron'
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde',
                    dog: 'Heron'
                });

                done();
            });
    });

    it('should execute multiple queries with args', done => {
        const nameDogQuery = lazyExecutor({
            schema,
            source: `{name(age: 20), dog(age: 3)}`
        });

        nameDogQuery({
                rootValue: {
                    name: 'Rohde',
                    dog: 'Heron'
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20',
                    dog: 'Heron - 3'
                });

                done();
            });
    });

    it('should execute query with variables', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `query($age: Int!){name(age: $age)}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                },
                variableValues: {
                    age: 20
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20'
                });

                done();
            });
    });

    it('should execute multiple queries with variables', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `query($age: Int!, $dogAge: Int!){ name(age: $age) dog(age: $dogAge)}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde',
                    dog: 'Heron'
                },
                variableValues: {
                    age: 20,
                    dogAge: 3
                }
            })
            .then(response => {
                expect(response.data).to.deep.equal({
                    name: 'Rohde - 20',
                    dog: 'Heron - 3'
                });

                done();
            });
    });

    it('should handle query runtime errors', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `query($age: Int!){name(age: $age)}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                },
                variableValues: {
                    age: 'NaN'
                }
            })
            .then(({
                errors
            }) => {
                expect(errors[0].message).to.equal('Variable "$age" got invalid value "NaN"; Expected type Int; Int cannot represent non-integer value: "NaN"')

                done();
            });
    });

    it('should handle missing variable errors', done => {
        const nameQuery = lazyExecutor({
            schema,
            source: `query($age: Int!){name(age: $age)}`
        });

        nameQuery({
                rootValue: {
                    name: 'Rohde'
                }
            })
            .then(({
                errors
            }) => {
                expect(errors[0].message).to.equal('Variable "$age" of required type "Int!" was not provided.')

                done();
            });
    });

    it('should handle query error', () => {
        expect(() => lazyExecutor({
            schema,
            source: `{name{name}}`
        })).to.throw('Field "name" must not have a selection since type "String" has no subfields.');
    });

    it('should handle internal error', done => {
        const errorQuery = lazyExecutor({
            customExecutor: () => {
                throw new Error('error');
            },
            schema,
            source: `{name}`
        });

        errorQuery({
                rootValue: {
                    name: 'Rohde'
                }
            })
            .catch(err => {
                expect(err.message).to.equal('error');
                done();
            });
    });
});