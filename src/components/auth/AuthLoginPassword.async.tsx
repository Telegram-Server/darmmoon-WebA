import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

import Loading from '../ui/Loading';

const AuthLoginPasswordAsync = () => {
  const AuthLoginPassword = useModuleLoader(Bundles.Auth, 'AuthLoginPassword');

  return AuthLoginPassword ? <AuthLoginPassword /> : <Loading />;
};

export default AuthLoginPasswordAsync;
