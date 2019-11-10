# GraphQL Lazy Executor

This executor pre validate and parse the query and returns a function which once executed, it returns a RxJS Observable with the result. Useful in high performance scenarios, once the query can be pre validated and parsed, and postpone the execution.

## Api
		lazyExecutor(
			schema: GraphQLSchema, 
			requestString: string,
			customValidators?: GraphQLValidator | Array<GraphQLValidator>
			customExecutor?: function(/* args like http://graphql.org/graphql-js/execution/#execute*/): MaybePromise<ExecutionResult>;

## Sample
		const {
		    GraphQLSchema,
		    GraphQLObjectType,
		    GraphQLString,
		    GraphQLInt
		} = require('graphql');

		const lazyExecutor = require('graphql-lazy-executor');

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
		            }
		        }
		    }),
		});

		const nameDogQuery = lazyExecutor({
			schema, 
			source: `{name, dog}`
		});

        nameDogQuery({
				contextValue: {
					contextValue: 'contextValue'
				},
				rootValue: {
					name: 'Rohde',
					dog: 'Heron'
				},
				variableValues: {
					variableValues: 'variableValues'
				}
			})
            .then(console.log);

            // will print
            {
            	data: {
	                name: 'Rohde',
	                dog: 'Heron'
	            }
            }
