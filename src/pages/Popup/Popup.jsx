import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  ChipDelete,
  Divider,
  FormControl,
  FormLabel,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy';

import React, { useEffect, useState } from 'react';
// import { loadStorage } from './utils';

const Popup = () => {
  const [data, setData] = useState({
    jobType: 'any',
    duration: 'any',
    locations: [],
    site: 'com', // com, ca
    activated: false,
    apiCallCount: "1"
  });

  const [locations, setLocations] = useState([]);

  // useEffect(() => {
  //   // console.log(loadStorage('amazonJobData'));
  //   chrome.storage.local.get('test', (result) => {
  //     console.log(result);
  //   });
  // }, []);

  function onChangeJobType(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      jobType: newValue,
    }));
  }

  function onChangeDuration(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      duration: newValue,
    }));
  }

  function onChangeSite(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      site: newValue,
    }));
  }

  function onChangeLocations(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      locations: [...prevData.locations, newValue],
    }));
  }

  function onChangeApiCallCount(event, newValue) {
    if (!newValue) return;
    setData((prevData) => ({
      ...prevData,
      apiCallCount: newValue,
    }));
  }

  function onDeleteLocation(location) {
    setData((prevData) => ({
      ...prevData,
      locations: prevData.locations.filter((loc) => loc !== location),
    }));
  }

  function onToggleActivate() {
    let isActivated = !data.activated;
    chrome.runtime.sendMessage({
      action: isActivated ? 'activate' : 'deactivate',
    });

    setData((prevData) => ({
      ...prevData,
      activated: !prevData.activated,
    }));

    if (isActivated) {
      chrome.tabs.create({
        url: `https://hiring.amazon.${data.site}/search/warehouse-jobs#/`,
      });
    }
  }

  useEffect(() => {
    loadStorage();
    console.log(localStorage.getItem('locations'));
    chrome.storage.local.get(['locations'], (result) => {
      if(result.locations) {
        setLocations(result.locations);
      }
    });
  }, []);

  function loadStorage() {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        setData(result.settings);
      }
    });
  }

  useEffect(() => {
    chrome.storage.local.set({ settings: data });
  }, [data]);

  return (
    <div className="App" style={{ padding: '12px' }}>
      <Typography level="h4" sx={{ mb: 2 }}>
        Amazon Job
      </Typography>
      <Card variant="outlined">
        <FormControl>
          <Stack spacing={2}>
            <div>
              <FormLabel htmlFor="api-call">Api Call Concurrent</FormLabel>
              <Select
                defaultValue="1"
                value={data.apiCallCount}
                onChange={onChangeApiCallCount}
                size="sm"
                slotProps={{
                  button: {
                    id: 'api-call',
                  },
                }}
              >
                <Option value="1">1</Option>
                <Option value="2">2</Option>
                <Option value="3">3</Option>
                <Option value="4">4</Option>
                <Option value="5">5</Option>
              </Select>
            </div>
            <div>
              <FormLabel htmlFor="job-type">Job Type</FormLabel>
              <Select
                defaultValue="any"
                value={data.jobType}
                onChange={onChangeJobType}
                size="sm"
                slotProps={{
                  button: {
                    id: 'job-type',
                  },
                }}
              >
                <Option value="any">Any</Option>
                <Option value="full time">Full Time</Option>
                <Option value="part time">Part Time</Option>
                <Option value="flex time">Flex Time</Option>
              </Select>
            </div>

            <div>
              <FormLabel htmlFor="duration">Duration</FormLabel>
              <Select
                defaultValue="any"
                value={data.duration}
                onChange={onChangeDuration}
                size="sm"
                slotProps={{
                  button: {
                    id: 'duration',
                  },
                }}
              >
                <Option value="any">Any</Option>
                <Option value="regular">Regular</Option>
                <Option value="seasonal">Seasonal</Option>
              </Select>
            </div>

            <div>
              <FormLabel htmlFor="site">Site</FormLabel>
              <Select
                defaultValue="com"
                value={data.site}
                onChange={onChangeSite}
                size="sm"
                slotProps={{
                  button: {
                    id: 'site',
                  },
                }}
              >
                <Option value="com">hiring.amazon.com</Option>
                <Option value="ca">hiring.amazon.ca</Option>
              </Select>
            </div>

            <div>
              <FormLabel>Location</FormLabel>
              <Card size="sm">
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {data.locations.length > 0 ? (
                    data.locations.map((location) => (
                      <Chip
                        key={location}
                        variant="soft"
                        color="primary"
                        size="sm"
                        endDecorator={
                          <ChipDelete
                            onClick={() => onDeleteLocation(location)}
                          />
                        }
                      >
                        {location}
                      </Chip>
                    ))
                  ) : (
                    <Chip
                      variant="soft"
                      color="primary"
                      size="sm"
                      endDecorator={<ChipDelete />}
                    >
                      Any
                    </Chip>
                  )}
                </Box>
                <Autocomplete options={locations} placeholder='Pick location' size='sm' onChange={onChangeLocations} freeSolo={true} clearOnBlur={true}/>
                {/* <Select
                  placeholder="Pick location"
                  size="sm"
                  onChange={onChangeLocations}
                >
          
                </Select> */}
              </Card>
            </div>
            <Divider></Divider>
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Button size="sm" fullWidth="true" variant="outlined">
                Reset
              </Button>
              <Button
                onClick={onToggleActivate}
                size="sm"
                fullWidth="true"
                color={data.activated ? 'danger' : 'primary'}
              >
                {data.activated ? 'Deactivate' : 'Activate'}
              </Button>
            </Stack>
          </Stack>
        </FormControl>
      </Card>
    </div>
  );
};

export default Popup;
