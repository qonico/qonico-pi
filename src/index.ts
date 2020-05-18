import { readFileSync, writeFileSync } from 'fs';
import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { createWalletFromMnemonic, Wallet, signTx, Tx } from '@tendermint/sig';
import { machineIdSync } from 'node-machine-id';

import { newMnemonic, getAccountDetails, broadcast, getDataNode } from './lib/utils';

const restServer = process.env.REST_SERVER || 'http://localhost:1317';
const chainId = process.env.CHAIN_ID || 'qonico';

type Config = {
  wallet?: Wallet,
  owner?: string,
  name?: string,
  channels?: {id: string, variable: string}[],
}

const config: Config = {};

const app = express();
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(helmet());
app.use(cors());

// random byte generation file for devices, it will generate same wallet for entire OS installation
const nodeMachineRandomBytes = () => machineIdSync();

// Initialize wallet
let mnemonic: string;
try {
  mnemonic = readFileSync('wallet.dat', 'utf-8');
} catch(e) {
  // For testing on same machine, Env USE_RANDOM will create different address
  mnemonic = newMnemonic(process.env.USE_RANDOM ? undefined : nodeMachineRandomBytes);
  writeFileSync('wallet.dat', mnemonic);
}

try {
  config.wallet = createWalletFromMnemonic(mnemonic);
} catch(e) {}

app.get('/wallet', (req, res) => {
  if (!config.wallet) {
    return res.send({});
  }

  res.send({
    address: config.wallet.address,
  });
});

app.get('/wallet/backup', (req, res) => {
  res.send({
    mnemonic,
  });
});

app.post('wallet', (req, res) => {
  if (!req.body.mnemonic) {
    return res.status(500).send('mnemonic required');
  }

  try {
    config.wallet = createWalletFromMnemonic(req.body.mnemonic);
  } catch(e) {
    return res.status(500).send('invalid mnemonic');
  }

  mnemonic = req.body.mnemonic;
  writeFileSync('wallet.dat', mnemonic);

  res.send({
    address: config.wallet.address,
  });
});

app.post('/owner/signed', async (req, res) => {
  if (!req.body.stdTx) {
    res.status(403).send('stdTx is a required field');
  }

  const accountDetails = _.get(await getAccountDetails(restServer, config.wallet.address), 'result.value', {});
  const meta = {
    account_number: accountDetails.account_number.toString(),
    sequence: accountDetails.sequence.toString(),
    chain_id: chainId,
  };

  const stdTx = signTx(req.body.stdTx, meta, config.wallet);
  const result = await broadcast(restServer, stdTx);
  if (!result.status) {
    config.owner = stdTx.msg[0].value.owner;
  }
  res.send(result);
});

app.post('/owner', async (req, res) => {
  if (!req.body.owner) {
    return res.status(403).send('owner is required');
  }

  const tx: Tx = {
    fee:  {
        amount: [{ amount: '10', denom: 'qon' }],
        gas:    '200000'
    },
    memo: 'Assign Owner to new device',
    msg: [{
        type:  'datanode/SetOwner',
        value: {
          datanode: config.wallet.address,
          owner: config.wallet.address,
          newowner: req.body.owner,
          name: req.body.name || config.wallet.address,
        },
    }],
  };

  res.send({ tx });
});

const updateDataNode = async () => {
  const { result = {} } = await getDataNode(restServer, config.wallet.address);
  config.owner = result.owner;
  config.name = result.name;
  config.channels = result.channels;

  console.log(result);
};

setInterval(updateDataNode, 30000);
updateDataNode();

const last: number[] = [];
setInterval(async () => {
  if (config.owner && config.channels && config.channels.length) {

    // Generate random signal per channel
    const records = config.channels.map((channel, i) => {
      last[i] = (last[i] || 0) | Math.round(Math.random()*3*1000);
      return {
        channel: channel.id,
        timestamp: Math.round(Date.now()/1000),
        value: last[i],
        misc: '',
      };
    });

    const tx: Tx = {
      fee:  {
          amount: [{ amount: '10', denom: 'qon' }],
          gas:    '200000'
      },
      memo: 'Add new record',
      msg: [{
          type:  'datanode/AddRecords',
          value: {
            datanode: config.wallet.address,
            records,
          },
      }],
    };

    const accountDetails = _.get(await getAccountDetails(restServer, config.wallet.address), 'result.value', {});
    const meta = {
      account_number: accountDetails.account_number.toString(),
      sequence: accountDetails.sequence.toString(),
      chain_id: chainId,
    };

    const stdTx = signTx(tx, meta, config.wallet);
    const result = await broadcast(restServer, stdTx);
    console.log(result);
  }
}, 10000);

app.listen(3001, () => console.log('listening on port 3001'));
