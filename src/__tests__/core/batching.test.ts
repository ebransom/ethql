import { testGraphql } from '../utils';

test('batching: requests are batched', async () => {
  const { execQuery, prepareContext } = testGraphql();

  const query = `
    {
      block(number: 5000000) {
        transactions {
          from {
            balance
          }
        }
      }
    }
  `;

  const context = prepareContext();
  const spy = jest.spyOn(context.web3.currentProvider, 'send');

  await execQuery(query, context);
  expect(spy).toHaveBeenCalledTimes(2);
});

test('batching: eth_calls are batched', async () => {
  const { execQuery, prepareContext } = testGraphql();

  const query = `
    {
      block(number: 5000000) {
        hash
        transactions {
          decoded {
            ... on ERC20Transfer {
              from {
                account {
                  address
                }
                tokenBalance
              }
            }
          }
        }
      }
    }`;

  const context = prepareContext();
  const spy = jest.spyOn(context.web3.currentProvider, 'send');

  await execQuery(query, context);
  expect(spy).toHaveBeenCalledTimes(2);
});

test('batching: requests are not batched', async () => {
  const { execQuery, prepareContext } = testGraphql({ batching: false });
  const query = `
    {
      block(number: 5000000) {
        transactions {
          from {
            balance
          }
        }
      }
    }
  `;

  const context = prepareContext();
  const spy = jest.spyOn(context.web3.currentProvider, 'send');

  await execQuery(query);
  expect(spy).toHaveBeenCalledTimes(110);
});
