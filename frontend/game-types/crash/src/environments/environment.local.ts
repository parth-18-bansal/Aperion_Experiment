export const environment = {
  local      : true,
  dev        : false,
  stage      : false,
  demo       : false,
  prod       : false,
  version    : '1.1.5'
};

// production için      -> -> ->    production : true,  test: false
// development için     -> -> ->    production : false, test: false
// test için            -> -> ->    production : true,  test: true