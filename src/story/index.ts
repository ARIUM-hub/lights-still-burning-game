import { buildStory } from '../engine/validateStory'
import { act1Nodes } from './act1'
import { act2Nodes } from './act2'
import { act3Nodes } from './act3'
import { act4Nodes } from './act4'
import { act5Nodes } from './act5'

export const storyNodes = [
  ...act1Nodes,
  ...act2Nodes,
  ...act3Nodes,
  ...act4Nodes,
  ...act5Nodes,
]

export const story = buildStory(storyNodes)
