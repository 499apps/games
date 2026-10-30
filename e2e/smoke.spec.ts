import { defineSmokeSuite } from '../src/kit/smoke/suite';
import { hubTargets } from './targets';

defineSmokeSuite(hubTargets());
