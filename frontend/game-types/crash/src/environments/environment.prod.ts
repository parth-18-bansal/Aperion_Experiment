export const environment = {
  local      : false,
  dev        : false,
  stage      : false,
  demo       : false,
  prod       : true,
  version    : '1.0.5'
};

// production için      -> -> ->    production : true,  test: false
// development için     -> -> ->    production : false, test: false
// test için            -> -> ->    production : true,  test: true