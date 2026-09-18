package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;

import java.util.Optional;

public interface PersonaRepository extends JpaRepository<Persona, Integer> {    
    
    Optional<Persona> findByCedula(Integer cedula); 
}