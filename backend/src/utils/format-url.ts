const formatURL = (url: string): string => {
  if(!url.startsWith("https://") && !url.startsWith("http://")) {
    url = "https://" + url;
  }

  return url;
};

export { formatURL };
