import { __get__ } from '../../src/remote'
const getRemote = __get__('getRemote')

export default {
  null: getRemote(null),
  github: getRemote('https://github.com/user/repo'),
  gitlab: getRemote('https://gitlab.com/user/repo'),
  gitlabSubgroup: getRemote('https://gitlab.com/user/repo/subgroup.git'),
  bitbucket: getRemote('https://bitbucket.org/user/repo'),
  azure: getRemote('https://dev.azure.com/user/project/_git/repo'),
  visualstudio: getRemote('https://user.visualstudio.com/project/_git/repo')
}
