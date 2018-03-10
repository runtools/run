#!/usr/bin/env node

import 'source-map-support/register';
import {join} from 'path';
import dotenv from 'dotenv';

dotenv.config({path: join(__dirname, '..', '..', '..', '..', '.env')});

require('./main');
